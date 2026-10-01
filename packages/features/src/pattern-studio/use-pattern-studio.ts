import type { FittedMannequin } from '@atelier/mannequin';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import type { ApiProblem } from '../api/designs-client.js';
import type { GarmentType } from '@atelier/contracts-ts';
import { isDraftedGarmentType } from './garment-fields.js';
import {
  type FieldErrors,
  initialForm,
  type MeasurementKey,
  type StudioForm,
  toVersionRequest,
} from './form.js';
import type { MannequinDisplay, MannequinStatus } from './fitter.js';
import type { GenerationResult, PatternStudioDeps } from './generate.js';
import { layoutPanels, type PanelsLayout } from './panels.js';
import { useStudioRun } from './use-studio-run.js';

export type StudioStatus = 'idle' | 'working' | 'ready' | 'failed';

export interface PatternStudioState {
  form: StudioForm;
  errors: FieldErrors;
  status: StudioStatus;
  layout?: PanelsLayout;
  mannequin?: FittedMannequin;
  /** État de l'ajustement du mannequin (Web Worker) : « en cours » sans figer l'écran. */
  mannequinStatus: MannequinStatus;
  /** Vue choisie : mannequin 3D ou silhouettes en trait. */
  display: MannequinDisplay;
  problem?: ApiProblem;
  versionNumber?: number;
}

export interface PatternStudioActions {
  setSex(sex: StudioForm['sex']): void;
  setMeasurement(key: MeasurementKey, cm: number | undefined): void;
  setGarmentType(type: GarmentType): void;
  /** Saisie d'un paramètre du type choisi : cm pour une longueur, nombre sans unité sinon. */
  setParam(param: string, value: number | undefined): void;
  setDisplay(display: MannequinDisplay): void;
  generate(): void;
}

type FormActions = Omit<PatternStudioActions, 'generate' | 'setDisplay' | 'setGarmentType'>;

function formActions(setForm: Dispatch<SetStateAction<StudioForm>>): FormActions {
  return {
    setSex: (sex) => setForm((f) => ({ ...f, sex })),
    setMeasurement: (key, cm) =>
      setForm((f) => ({ ...f, measurementsCm: { ...f.measurementsCm, [key]: cm } })),
    setParam: (param, value) =>
      setForm((f) => ({
        ...f,
        paramsByType: {
          ...f.paramsByType,
          [f.garmentType]: { ...f.paramsByType[f.garmentType], [param]: value },
        },
      })),
  };
}

function statusOf(isWorking: boolean, result: GenerationResult | undefined): StudioStatus {
  if (isWorking) return 'working';
  if (!result) return 'idle';
  return result.problem ? 'failed' : 'ready';
}

/** Modèle de vue de l'atelier de patron : l'écran ne reçoit que { state, actions }. */
export function usePatternStudio(deps: PatternStudioDeps): {
  state: PatternStudioState;
  actions: PatternStudioActions;
} {
  const [form, setForm] = useState(initialForm);
  const [display, setDisplay] = useState<MannequinDisplay>('3d');
  const { patron, body, run, clearPatron } = useStudioRun(deps);
  const request = toVersionRequest(form);
  const result = patron.result;
  const layout = useMemo(
    () => (result?.version ? layoutPanels(result.version.spec) : undefined),
    [result],
  );
  const actions: PatternStudioActions = {
    ...formActions(setForm),
    setDisplay,
    setGarmentType: (type) => {
      if (type === form.garmentType || !isDraftedGarmentType(type)) return;
      setForm((f) => ({ ...f, garmentType: type }));
      clearPatron();
    },
    generate: () => {
      if (request.isOk()) run(request.value);
    },
  };
  const state: PatternStudioState = {
    form,
    errors: request.isErr() ? request.error : {},
    status: statusOf(patron.pending || body.status === 'fitting', result),
    layout,
    mannequin: body.mannequin,
    mannequinStatus: body.status,
    display,
    problem: result?.problem,
    versionNumber: result?.version?.number,
  };
  return { state, actions };
}
