import { itemAt } from './access.js';
import { GeometryError } from './errors.js';
import type { BoundingBoxMm, PointMm } from './types.js';
import { distanceMm } from './vector.js';

/** Deux points consécutifs plus proches que cela sont confondus (0,05 mm : bien en dessous de la précision d'une coupe). */
export const DEDUPE_TOLERANCE_MM = 0.05;

/**
 * Retire les points consécutifs confondus : un point n'est gardé que s'il est à plus de `toleranceMm` du dernier point
 * gardé. Pour un polygone (`closed`), retire aussi les derniers points confondus avec le premier, sans descendre sous
 * deux points. Rend un nouveau tableau ; les points sont ceux de l'entrée.
 */
export function dedupePoints(
  points: readonly PointMm[],
  closed = false,
  toleranceMm = DEDUPE_TOLERANCE_MM,
): PointMm[] {
  const kept: PointMm[] = [];
  for (const p of points) {
    const last = kept[kept.length - 1];
    if (last === undefined || distanceMm(last, p) > toleranceMm) kept.push(p);
  }
  while (
    closed &&
    kept.length > 2 &&
    distanceMm(itemAt(kept, 0), itemAt(kept, kept.length - 1)) <= toleranceMm
  ) {
    kept.pop();
  }
  return kept;
}

/** Boîte englobante d'une liste de points ; une liste vide n'en a pas (`GeometryError`). */
export function boundingBox(points: readonly PointMm[]): BoundingBoxMm {
  const first = points[0];
  if (first === undefined) {
    throw new GeometryError('invalid-argument', 'a bounding box needs at least one point');
  }
  let minXMm = first.xMm;
  let minYMm = first.yMm;
  let maxXMm = first.xMm;
  let maxYMm = first.yMm;
  for (const p of points) {
    minXMm = Math.min(minXMm, p.xMm);
    minYMm = Math.min(minYMm, p.yMm);
    maxXMm = Math.max(maxXMm, p.xMm);
    maxYMm = Math.max(maxYMm, p.yMm);
  }
  return { minXMm, minYMm, maxXMm, maxYMm };
}
