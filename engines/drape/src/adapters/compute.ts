import type { DrapeCompleted, DrapeFailed, DrapeJob } from '@atelier/contracts-ts';
import { buildGlb, completedEvent, drapeGarment, failedEvent, loadAvatarEngine } from '../node.js';
import { internalFailure } from './messages.js';

// Calcul d'un travail : drapé, GLB, contenu de l'événement. Synchrone et lourd : il s'exécute dans un fil dédié
// (`drape-thread.ts`) pour que le fil principal garde NATS en vie et émette les signaux de travail.

export type ComputeResult =
  | { kind: 'completed'; glb: Uint8Array; event: DrapeCompleted }
  | { kind: 'failed'; event: DrapeFailed };

export async function computeDrape(job: DrapeJob, cacheKey: string): Promise<ComputeResult> {
  await loadAvatarEngine();
  try {
    const outcome = drapeGarment(job);
    if (!outcome.ok) return { kind: 'failed', event: failedEvent(job, outcome.problem) };
    const glb = buildGlb(outcome);
    return { kind: 'completed', glb, event: completedEvent(job, outcome, glb, cacheKey) };
  } catch {
    // Entrée que le moteur ne sait pas traiter : le calcul est déterministe, la rejouer échouerait de même.
    return { kind: 'failed', event: internalFailure(job) };
  }
}
