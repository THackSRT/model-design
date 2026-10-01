import type { CreateDesignVersionRequest, DesignVersion, GarmentType } from '@atelier/contracts-ts';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';
import type { MannequinFitter } from './fitter.js';

export interface PatternStudioDeps {
  designs: DesignsClient;
  /** Ajuste le mannequin hors du fil principal (Web Worker dans l'application). */
  mannequin: MannequinFitter;
  /** Nom du modèle créé pour un type de vêtement (libellé traduit fourni par l'application). */
  designName(type: GarmentType): string;
}

export interface GenerationResult {
  version?: DesignVersion;
  problem?: ApiProblem;
}

/** Un modèle par type de vêtement : le service refuse une version d'un autre type. */
export interface StudioSession {
  designIds: Partial<Record<GarmentType, string>>;
}

/** Calcule le patron (service designs) ; l'ajustement du mannequin est suivi à part. */
export async function generate(
  designs: DesignsClient,
  session: StudioSession,
  request: CreateDesignVersionRequest,
  designName: PatternStudioDeps['designName'],
): Promise<GenerationResult> {
  const type = request.garment.type;
  let designId = session.designIds[type];
  if (!designId) {
    const design = await designs.createDesign({ name: designName(type), garmentType: type });
    if (design.isErr()) return { problem: design.error };
    designId = design.value.id;
    session.designIds[type] = designId;
  }
  const version = await designs.createVersion(designId, request);
  return version.isOk() ? { version: version.value } : { problem: version.error };
}
