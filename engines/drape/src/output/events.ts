import type { DrapeCompleted, DrapeFailed, DrapeJob } from '@atelier/contracts-ts';
import type { DrapeSuccess } from '../drape/drape-garment.js';
import type { DrapeProblem, DrapeProblemType } from '../drape/problems.js';
import { modelKeyOf, sha256Hex } from './cache-key.js';

// Contenu exact de `drape.completed` et `drape.failed` (contrats/schemas/events). Aucune mesure, aucun texte libre.
// Réservé à Node (empreinte SHA-256).

type JobIds = Pick<DrapeJob, 'drapeId' | 'designId' | 'versionNumber' | 'organizationId'>;

/** Type du contrat pour chaque problème du moteur. `invalid-input` est publié comme erreur interne : `designs`
 * valide la demande en amont, un patron refusé ici est donc un défaut du moteur (décision de l'orchestrateur). */
export const FAILURE_TYPES: Record<DrapeProblemType, DrapeFailed['type']> = {
  'placement-missing': '/problems/drape-placement-missing',
  'placement-failed': '/problems/drape-placement-failed',
  'seam-not-closed': '/problems/drape-seam-not-closed',
  'body-penetration': '/problems/drape-body-penetration',
  'drape-too-large': '/problems/drape-too-large',
  'invalid-input': '/problems/drape-internal',
};

const idsOf = (job: JobIds): JobIds => ({
  drapeId: job.drapeId,
  designId: job.designId,
  versionNumber: job.versionNumber,
  organizationId: job.organizationId,
});

/**
 * `drape.completed` : résultat du moteur plus clé, taille et empreinte du GLB. `cacheKey` est celui de `cacheKeyOf`.
 */
export function completedEvent(
  job: JobIds,
  success: DrapeSuccess,
  glb: Uint8Array,
  cacheKey: string,
): DrapeCompleted {
  return {
    ...idsOf(job),
    result: {
      modelKey: modelKeyOf(job.organizationId, cacheKey),
      sizeBytes: glb.length,
      sha256: sha256Hex(glb),
      ...success.result,
    },
  };
}

/** `drape.failed` : type stable du contrat. Jamais réessayable : le calcul est déterministe, la même demande échouera. */
export function failedEvent(job: JobIds, problem: DrapeProblem): DrapeFailed {
  return { ...idsOf(job), type: FAILURE_TYPES[problem.type], retryable: false };
}
