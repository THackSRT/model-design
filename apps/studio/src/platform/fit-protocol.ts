import type { FitOptions, FittedMannequin, MannequinEngine } from '@atelier/mannequin';

type MeasurementSet = Parameters<MannequinEngine['fit']>[0];

/** Messages échangés entre le fil principal et le worker d'ajustement du mannequin. */
export interface FitRequest {
  id: number;
  measurements: MeasurementSet;
  options?: FitOptions;
}

export type FitResponse =
  { id: number; ok: true; mannequin: FittedMannequin } | { id: number; ok: false; message: string };

export interface HandledFit {
  response: FitResponse;
  /** Tampons à transférer (pas copier) avec la réponse. */
  transfer: ArrayBuffer[];
}

/** Tampons du corps ajusté, sans doublon (deux tableaux peuvent partager un tampon). */
export function transferablesOf(mannequin: FittedMannequin): ArrayBuffer[] {
  const { positions, normals, index } = mannequin.body;
  const buffers = [positions.buffer, normals.buffer, index.buffer];
  return [...new Set(buffers)].filter((b): b is ArrayBuffer => b instanceof ArrayBuffer);
}

/** Traite une demande d'ajustement : fonction pure, testable sans Worker. */
export function handleFitRequest(engine: MannequinEngine, request: FitRequest): HandledFit {
  try {
    const mannequin = engine.fit(request.measurements, request.options);
    return {
      response: { id: request.id, ok: true, mannequin },
      transfer: transferablesOf(mannequin),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { response: { id: request.id, ok: false, message }, transfer: [] };
  }
}
