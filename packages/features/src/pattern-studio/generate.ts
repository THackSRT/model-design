import type { CreateDesignVersionRequest, DesignVersion } from '@atelier/contracts-ts';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';
import type { MannequinFitter } from './fitter.js';

export interface PatternStudioDeps {
  designs: DesignsClient;
  /** Ajuste le mannequin hors du fil principal (Web Worker dans l'application). */
  mannequin: MannequinFitter;
}

export interface GenerationResult {
  version?: DesignVersion;
  problem?: ApiProblem;
}

export interface StudioSession {
  designId?: string;
}

/** Calcule le patron (service designs) ; l'ajustement du mannequin est suivi à part. */
export async function generate(
  designs: DesignsClient,
  session: StudioSession,
  request: CreateDesignVersionRequest,
): Promise<GenerationResult> {
  if (!session.designId) {
    const design = await designs.createDesign({
      name: 'Jupe droite',
      garmentType: 'straight-skirt',
    });
    if (design.isErr()) return { problem: design.error };
    session.designId = design.value.id;
  }
  const version = await designs.createVersion(session.designId, request);
  return version.isOk() ? { version: version.value } : { problem: version.error };
}
