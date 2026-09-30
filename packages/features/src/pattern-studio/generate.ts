import type { CreateDesignVersionRequest, DesignVersion } from '@atelier/contracts-ts';
import type { FittedMannequin, MannequinEngine } from '@atelier/mannequin';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';

export interface PatternStudioDeps {
  designs: DesignsClient;
  /** Charge le moteur mannequin une seule fois (l'appelant garde la promesse en cache). */
  loadMannequin: () => Promise<MannequinEngine>;
}

export interface GenerationResult {
  version?: DesignVersion;
  mannequin?: FittedMannequin;
  problem?: ApiProblem;
}

export interface StudioSession {
  designId?: string;
}

async function fitMannequin(deps: PatternStudioDeps, request: CreateDesignVersionRequest) {
  try {
    return (await deps.loadMannequin()).fit(request.measurements);
  } catch {
    return undefined; // le patron reste utile sans mannequin (données absentes, appareil trop lent…)
  }
}

/** Ajuste le mannequin (localement) et calcule le patron (service designs), pour la même saisie. */
export async function generate(
  deps: PatternStudioDeps,
  session: StudioSession,
  request: CreateDesignVersionRequest,
): Promise<GenerationResult> {
  const mannequin = await fitMannequin(deps, request);
  if (!session.designId) {
    const design = await deps.designs.createDesign({
      name: 'Jupe droite',
      garmentType: 'straight-skirt',
    });
    if (design.isErr()) return { mannequin, problem: design.error };
    session.designId = design.value.id;
  }
  const version = await deps.designs.createVersion(session.designId, request);
  return version.isOk()
    ? { mannequin, version: version.value }
    : { mannequin, problem: version.error };
}
