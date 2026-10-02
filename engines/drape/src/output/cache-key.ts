import { createHash } from 'node:crypto';
import type { DrapeJob } from '@atelier/contracts-ts';
import { resolveFabric } from '../core/fabric.js';
import { ENGINE_VERSION } from '../version.js';

// Clé de cache et empreintes (ADR 0013). Réservé à Node (`node:crypto`).

/** JSON canonique : clés d'objet triées (ordre des codets), sans espace ; `undefined` est omis comme dans JSON. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v ?? null)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Clé de cache d'un travail : SHA-256 du JSON canonique de { spec, measurements, avatar, tissu résolu, qualité,
 * version du moteur }. Les identifiants (drapé, organisation, dessin, version) n'y entrent pas : deux demandes
 * identiques d'une même organisation partagent le modèle ; le préfixe d'organisation de `modelKeyOf` isole le reste.
 */
export function cacheKeyOf(job: DrapeJob): string {
  return sha256Hex(
    canonicalJson({
      spec: job.spec,
      measurements: job.measurements,
      avatar: job.avatar,
      fabric: resolveFabric(job.fabric),
      quality: job.quality,
      engineVersion: ENGINE_VERSION,
    }),
  );
}

/** Clé d'objet du seau privé : `drapes/<organizationId>/<cacheKey>.glb`. */
export const modelKeyOf = (organizationId: string, cacheKey: string): string =>
  `drapes/${organizationId}/${cacheKey}.glb`;
