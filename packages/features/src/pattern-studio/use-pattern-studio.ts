import type { FittedMannequin } from '@atelier/mannequin';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import type { ApiProblem } from '../api/designs-client.js';
import type { GarmentType } from '@atelier/contracts-ts';
import { isDraftedGarmentType } from './garment-fields.js';
import {
  type FinishedField,
  type FinishedKey,
  finishedFields,
  syncFinished,
  withFinished,
  withMeasurement,
  withParam,
  withRecalculated,
  withSleeveParam,
} from './garment-measures.js';
import {
  type FieldErrors,
  initialForm,
  type MeasurementKey,
  type StudioForm,
  toVersionRequest,
} from './form.js';
import type { CreateDesignVersionRequest, DesignVersion } from '@atelier/contracts-ts';
import type {
  DressingState,
  MannequinDisplay,
  MannequinFitter,
  MannequinState,
  MannequinStatus,
} from './fitter.js';
import { useDressing } from './use-dressing.js';
import type { GenerationResult, PatternStudioDeps } from './generate.js';
import { layoutPanels, type PanelsLayout } from './panels.js';
import { useStudioRun } from './use-studio-run.js';

export type StudioStatus = 'idle' | 'working' | 'ready' | 'failed';

export interface PatternStudioState {
  form: StudioForm;
  errors: FieldErrors;
  /** Mesures finies du vêtement du type choisi : valeur, origine (`auto` ou `manual`) et erreur. */
  finished: FinishedField[];
  status: StudioStatus;
  layout?: PanelsLayout;
  mannequin?: FittedMannequin;
  /** État de l'ajustement du mannequin (Web Worker) : « en cours » sans figer l'écran. */
  mannequinStatus: MannequinStatus;
  /** Vue choisie : mannequin 3D ou silhouettes en trait. */
  display: MannequinDisplay;
  /** Vêtement porté sur le mannequin et son calcul (Web Worker). */
  dressing: DressingState;
  /** Montrer le vêtement sur le mannequin (3D et silhouettes). */
  showGarment: boolean;
  problem?: ApiProblem;
  versionNumber?: number;
  /** Modèle de la version calculée : avec `versionNumber`, ce qu'il faut pour les pièces de coupe. */
  designId?: string;
  /** La saisie diffère de celle du dernier calcul (ou de la dernière reprise) : à confirmer avant de la remplacer. */
  dirty: boolean;
  /** Nombre de calculs lancés dans la session : change dès qu'un calcul démarre. */
  runs: number;
}

export interface PatternStudioActions {
  setSex(sex: StudioForm['sex']): void;
  /** Mesure du corps : les mesures finies `auto` suivent, les `manual` gardent leur valeur. */
  setMeasurement(key: MeasurementKey, cm: number | undefined): void;
  /** Saisie d'une mesure finie du vêtement (cm) : le champ passe à `manual`. */
  setFinished(key: FinishedKey, cm: number | undefined): void;
  /** Remet une mesure finie (ou toutes celles du type) à `auto`, à la valeur calculée du corps. */
  recalculateFinished(key?: FinishedKey): void;
  setGarmentType(type: GarmentType): void;
  /** Saisie d'un paramètre du type choisi : cm pour une longueur, nombre sans unité sinon. */
  setParam(param: string, value: number | undefined): void;
  /** Corsage : avec ou sans manches. */
  setWithSleeve(enabled: boolean): void;
  /** Saisie d'un paramètre des manches (cm). */
  setSleeveParam(param: string, value: number | undefined): void;
  setDisplay(display: MannequinDisplay): void;
  setShowGarment(show: boolean): void;
  generate(): void;
  /** Remplace tout le formulaire (reprise d'une version) et efface le patron, comme le ferait une saisie. */
  applyForm(form: StudioForm): void;
}

type FormActions = Omit<
  PatternStudioActions,
  'generate' | 'applyForm' | 'setDisplay' | 'setGarmentType' | 'setShowGarment'
>;

function formActions(setForm: Dispatch<SetStateAction<StudioForm>>): FormActions {
  return {
    setSex: (sex) => setForm((f) => ({ ...f, sex })),
    setMeasurement: (key, cm) => setForm((f) => withMeasurement(f, key, cm)),
    setFinished: (key, cm) => setForm((f) => withFinished(f, key, cm)),
    recalculateFinished: (key) => setForm((f) => withRecalculated(f, key)),
    setParam: (param, value) => setForm((f) => withParam(f, param, value)),
    setWithSleeve: (withSleeve) => setForm((f) => ({ ...f, withSleeve })),
    setSleeveParam: (param, value) => setForm((f) => withSleeveParam(f, param, value)),
  };
}

function statusOf(isWorking: boolean, result: GenerationResult | undefined): StudioStatus {
  if (isWorking) return 'working';
  if (!result) return 'idle';
  return result.problem ? 'failed' : 'ready';
}

/** Habillage du mannequin avec le patron de la version calculée. */
function useDressingOf(fitter: MannequinFitter, body: MannequinState, version?: DesignVersion) {
  const input = useMemo(
    () => (version ? { spec: version.spec, garmentType: version.garment.type } : undefined),
    [version],
  );
  return useDressing(fitter, body.status === 'ready', body.mannequin, input);
}

function useLayout(result?: GenerationResult) {
  return useMemo(() => (result?.version ? layoutPanels(result.version.spec) : undefined), [result]);
}

interface FormSession {
  form: StudioForm;
  setForm: Dispatch<SetStateAction<StudioForm>>;
  /** Saisie du dernier calcul ou de la dernière reprise : la saisie a-t-elle changé depuis ? */
  dirty: boolean;
  markSaved(form: StudioForm): void;
  /** Nombre de calculs lancés dans la session. */
  runs: number;
  countRun(): void;
}

function useFormSession(): FormSession {
  const [form, setForm] = useState(initialForm);
  const [baseline, setBaseline] = useState(initialForm);
  const [runs, setRuns] = useState(0);
  const countRun = () => setRuns((n) => n + 1);
  return { form, setForm, dirty: form !== baseline, markSaved: setBaseline, runs, countRun };
}

type SessionActions = Pick<PatternStudioActions, 'setGarmentType' | 'generate' | 'applyForm'>;

/** Actions qui touchent à la fois la saisie et le patron affiché. */
function sessionActions(
  { form, setForm, markSaved, countRun }: FormSession,
  run: (request: CreateDesignVersionRequest, onCreated?: () => void) => void,
  clearPatron: () => void,
): SessionActions {
  return {
    setGarmentType: (type) => {
      if (type === form.garmentType || !isDraftedGarmentType(type)) return;
      setForm((f) => syncFinished({ ...f, garmentType: type }));
      clearPatron();
    },
    generate: () => {
      const request = toVersionRequest(form);
      if (!request.isOk()) return;
      countRun();
      run(request.value, () => markSaved(form));
    },
    applyForm: (next) => {
      setForm(next);
      markSaved(next);
      clearPatron();
    },
  };
}

/** Modèle de vue de l'atelier de patron : l'écran ne reçoit que { state, actions }. */
export function usePatternStudio(deps: PatternStudioDeps): {
  state: PatternStudioState;
  actions: PatternStudioActions;
} {
  const session = useFormSession();
  const { form, setForm, dirty } = session;
  const [display, setDisplay] = useState<MannequinDisplay>('3d');
  const [showGarment, setShowGarment] = useState(true);
  const { patron, body, run, clearPatron } = useStudioRun(deps);
  const request = toVersionRequest(form);
  const result = patron.result;
  const layout = useLayout(result);
  const dressing = useDressingOf(deps.mannequin, body, result?.version);
  const actions: PatternStudioActions = {
    ...formActions(setForm),
    setDisplay,
    setShowGarment,
    ...sessionActions(session, run, clearPatron),
  };
  const errors = request.isErr() ? request.error : {};
  const state: PatternStudioState = {
    form,
    errors,
    finished: finishedFields(form, errors),
    status: statusOf(patron.pending || body.status === 'fitting', result),
    ...{ layout, mannequin: body.mannequin, mannequinStatus: body.status },
    ...{ display, dressing, showGarment, dirty, runs: session.runs },
    problem: result?.problem,
    versionNumber: result?.version?.number,
    designId: result?.version?.designId,
  };
  return { state, actions };
}
