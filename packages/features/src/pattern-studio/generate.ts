import type { CreateDesignVersionRequest, DesignVersion, GarmentType } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
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

/**
 * Un modèle par type de vêtement : le service refuse une version d'un autre type. On garde la
 * création (promesse) et non son résultat : deux calculs rapides partagent la même création.
 */
export interface StudioSession {
  designIds: Partial<Record<GarmentType, Promise<Result<string, ApiProblem>>>>;
}

async function createDesignId(
  designs: DesignsClient,
  type: GarmentType,
  name: string,
): Promise<Result<string, ApiProblem>> {
  const design = await designs.createDesign({ name, garmentType: type });
  return design.isOk() ? ok(design.value.id) : err(design.error);
}

/** Calcule le patron (service designs) ; l'ajustement du mannequin est suivi à part. */
export async function generate(
  designs: DesignsClient,
  session: StudioSession,
  request: CreateDesignVersionRequest,
  designName: PatternStudioDeps['designName'],
): Promise<GenerationResult> {
  const type = request.garment.type;
  const creation = (session.designIds[type] ??= createDesignId(designs, type, designName(type)));
  const designId = await creation;
  if (designId.isErr()) {
    if (session.designIds[type] === creation) session.designIds[type] = undefined; // permet de réessayer
    return { problem: designId.error };
  }
  const version = await designs.createVersion(designId.value, request);
  return version.isOk() ? { version: version.value } : { problem: version.error };
}
