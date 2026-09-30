import type { CreateDesignVersionRequest } from '@atelier/contracts-ts';
import type { FittedMannequin } from '@atelier/mannequin';
import { useMutation } from '@tanstack/react-query';
import { type Dispatch, type SetStateAction, useMemo, useRef, useState } from 'react';
import type { ApiProblem } from '../api/designs-client.js';
import {
  type FieldErrors,
  initialForm,
  type MeasurementKey,
  type StudioForm,
  toVersionRequest,
} from './form.js';
import {
  generate,
  type GenerationResult,
  type PatternStudioDeps,
  type StudioSession,
} from './generate.js';
import { layoutPanels, type PanelsLayout } from './panels.js';

export type StudioStatus = 'idle' | 'working' | 'ready' | 'failed';

export interface PatternStudioState {
  form: StudioForm;
  errors: FieldErrors;
  status: StudioStatus;
  layout?: PanelsLayout;
  mannequin?: FittedMannequin;
  problem?: ApiProblem;
  versionNumber?: number;
}

export interface PatternStudioActions {
  setSex(sex: StudioForm['sex']): void;
  setMeasurement(key: MeasurementKey, cm: number | undefined): void;
  setSkirt(key: keyof StudioForm['skirtCm'], cm: number | undefined): void;
  generate(): void;
}

type FormActions = Omit<PatternStudioActions, 'generate'>;

function formActions(setForm: Dispatch<SetStateAction<StudioForm>>): FormActions {
  return {
    setSex: (sex) => setForm((f) => ({ ...f, sex })),
    setMeasurement: (key, cm) =>
      setForm((f) => ({ ...f, measurementsCm: { ...f.measurementsCm, [key]: cm } })),
    setSkirt: (key, cm) => setForm((f) => ({ ...f, skirtCm: { ...f.skirtCm, [key]: cm } })),
  };
}

function statusOf(isPending: boolean, result: GenerationResult | undefined): StudioStatus {
  if (isPending) return 'working';
  if (!result) return 'idle';
  return result.problem ? 'failed' : 'ready';
}

/** Modèle de vue de l'atelier de patron : l'écran ne reçoit que { state, actions }. */
export function usePatternStudio(deps: PatternStudioDeps): {
  state: PatternStudioState;
  actions: PatternStudioActions;
} {
  const [form, setForm] = useState(initialForm);
  const session = useRef<StudioSession>({});
  const mutation = useMutation({
    mutationFn: (req: CreateDesignVersionRequest) => generate(deps, session.current, req),
  });
  const request = toVersionRequest(form);
  const result = mutation.data;
  const layout = useMemo(
    () => (result?.version ? layoutPanels(result.version.spec) : undefined),
    [result],
  );
  const actions: PatternStudioActions = {
    ...formActions(setForm),
    generate: () => {
      if (request.isOk()) mutation.mutate(request.value);
    },
  };
  const state: PatternStudioState = {
    form,
    errors: request.isErr() ? request.error : {},
    status: statusOf(mutation.isPending, result),
    layout,
    mannequin: result?.mannequin,
    problem: result?.problem,
    versionNumber: result?.version?.number,
  };
  return { state, actions };
}
