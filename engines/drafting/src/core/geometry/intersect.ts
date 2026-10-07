import { itemAt, ringItemAt } from './access.js';
import type { Crossing, PointMm, PolygonMm, PolylineMm, SegmentIntersection } from './types.js';
import { addPoints, crossProduct, scalePoint, subtractPoints } from './vector.js';

/** Deux segments dont le déterminant est plus petit sont tenus pour parallèles (ou confondus : pas d'intersection). */
const PARALLEL_EPSILON = 1e-12;

/** Une intersection au bout d'un segment compte, à cette marge près sur la position (0 à 1). */
const POSITION_EPSILON = 1e-9;

const isOnSegment = (position: number): boolean =>
  position >= -POSITION_EPSILON && position <= 1 + POSITION_EPSILON;

/**
 * Intersection des segments `[a, b]` et `[c, d]`, ou `undefined` s'ils sont parallèles, confondus ou disjoints. Les
 * extrémités comptent (à 1e-9 de la longueur du segment près).
 */
export function intersectSegments(
  a: PointMm,
  b: PointMm,
  c: PointMm,
  d: PointMm,
): SegmentIntersection | undefined {
  const r = subtractPoints(b, a);
  const s = subtractPoints(d, c);
  const determinant = crossProduct(r, s);
  if (Math.abs(determinant) < PARALLEL_EPSILON) return undefined;
  const q = subtractPoints(c, a);
  const t = crossProduct(q, s) / determinant;
  const u = crossProduct(q, r) / determinant;
  if (!isOnSegment(t) || !isOnSegment(u)) return undefined;
  return { t, u, point: addPoints(a, scalePoint(r, t)) };
}

/**
 * Croisements d'une polyligne ouverte `cut` avec le contour d'un polygone, dans l'ordre de la polyligne (à égalité, par
 * indice d'arête). Une découpe qui passe exactement par un sommet croise les deux arêtes qui s'y joignent : deux
 * croisements au même point.
 */
export function polygonCrossings(polygon: PolygonMm, cut: PolylineMm): Crossing[] {
  const crossings: Crossing[] = [];
  for (let i = 0; i < cut.length - 1; i++) {
    for (let j = 0; j < polygon.length; j++) {
      const hit = intersectSegments(
        itemAt(cut, i),
        itemAt(cut, i + 1),
        itemAt(polygon, j),
        ringItemAt(polygon, j + 1),
      );
      if (hit !== undefined) {
        crossings.push({
          cutPosition: i + hit.t,
          edgeIndex: j,
          edgePosition: hit.u,
          point: hit.point,
        });
      }
    }
  }
  return crossings.sort((x, y) => x.cutPosition - y.cutPosition);
}
