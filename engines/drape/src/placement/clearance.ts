import { buildBodyGrid, type BodyGrid } from '../core/body-grid.js';
import { NEAREST_SIZE, WORK_SIZE, nearestOnBody } from '../core/body-query.js';
import type { BodyMesh } from '../core/types.js';
import { PlacementError } from './types.js';

// Garde-fou du départ : aucun sommet dans le corps ni à moins de `MIN_START_GAP_MM` de sa surface (une enveloppe
// convexe par tranche peut frôler un renflement entre deux niveaux). Un sommet trop près est repoussé le long de la
// normale ; si cela demande plus de `MAX_PUSH_MM`, l'enroulement est impossible.

/** Distance minimale au corps au départ, mm. */
export const MIN_START_GAP_MM = 3;
/** Déplacement maximal d'un sommet pour le dégager, mm. */
export const MAX_PUSH_MM = 100;
/** Portée de la recherche du triangle le plus proche, mm. */
const RANGE_MM = 40;

export interface ClearanceReport {
  /** Sommets repoussés. */
  pushed: number;
  /** Plus grand déplacement, mm. */
  maxPushMm: number;
}

/** Direction de poussée unitaire (vers l'extérieur) : du point le plus proche au sommet, ou la normale de la face. */
function pushDirection(n: Float64Array, p: Float64Array): [number, number, number] {
  const dist = n[0] as number;
  if ((n[7] as number) > 0 && dist > 1e-9) {
    return [
      ((p[0] as number) - (n[1] as number)) / dist,
      ((p[1] as number) - (n[2] as number)) / dist,
      ((p[2] as number) - (n[3] as number)) / dist,
    ];
  }
  return [n[4] as number, n[5] as number, n[6] as number];
}

/** Repousse les sommets de `positions` (modifié sur place) à `MIN_START_GAP_MM` du corps au moins. */
export function keepClearOfBody(positions: Float64Array, body: BodyMesh): ClearanceReport {
  const grid: BodyGrid = buildBodyGrid(body, RANGE_MM);
  const work = new Float64Array(WORK_SIZE);
  const out = new Float64Array(NEAREST_SIZE);
  const p = new Float64Array(3);
  const report: ClearanceReport = { pushed: 0, maxPushMm: 0 };
  for (let v = 0; v < positions.length / 3; v++) {
    for (let k = 0; k < 3; k++) p[k] = positions[3 * v + k] as number;
    if (!nearestOnBody(grid, p, -1, { work, out }) || (out[7] as number) >= MIN_START_GAP_MM)
      continue;
    const dir = pushDirection(out, p);
    let moved = 0;
    for (let k = 0; k < 3; k++) {
      const target = (out[1 + k] as number) + (dir[k] as number) * MIN_START_GAP_MM;
      moved += (target - (p[k] as number)) * (target - (p[k] as number));
      positions[3 * v + k] = target;
    }
    report.pushed++;
    report.maxPushMm = Math.max(report.maxPushMm, Math.sqrt(moved));
  }
  if (report.maxPushMm > MAX_PUSH_MM) {
    throw new PlacementError(
      'placement-failed',
      undefined,
      'the garment cannot be wrapped around the body',
    );
  }
  return report;
}
