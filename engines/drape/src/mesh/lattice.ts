// Points intérieurs d'une pièce : réseau triangulaire de pas h (rangées décalées d'une demi-arête), restreint à
// l'intérieur du contour (règle pair-impair) et à plus de h/2 du bord. Mm, arithmétique de base et racine carrée.

import { MAX_VERTICES_PER_GARMENT, assertVertexBudget } from './limits.js';

const SQRT3_2 = Math.sqrt(3) / 2;

/** Distance minimale exigée au bord, en multiples de h. */
export const MIN_BOUNDARY_DISTANCE_RATIO = 0.5;

/** Carré de la distance du point (px, py) au segment [(ax, ay), (bx, by)]. */
function segmentDistance2(
  p: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const [ex, ey] = [b[0] - a[0], b[1] - a[1]];
  const len2 = ex * ex + ey * ey;
  const t =
    len2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / len2)) : 0;
  const [dx, dy] = [p[0] - (a[0] + t * ex), p[1] - (a[1] + t * ey)];
  return dx * dx + dy * dy;
}

/** Vrai si (x, y) est dans le contour (pair-impair) et à plus de `minDistance` du bord. */
export function isInteriorPoint(
  boundary: Float64Array,
  x: number,
  y: number,
  minDistance: number,
): boolean {
  const n = boundary.length / 2;
  const min2 = minDistance * minDistance;
  let inside = false;
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    const a: [number, number] = [boundary[2 * i] as number, boundary[2 * i + 1] as number];
    const b: [number, number] = [boundary[2 * j] as number, boundary[2 * j + 1] as number];
    if (segmentDistance2([x, y], a, b) <= min2) return false;
    if (a[1] > y !== b[1] > y && x < a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) {
      inside = !inside;
    }
  }
  return inside;
}

/** Produit candidats × points du contour au plus (au-delà, le test d'intérieur coûterait trop cher). */
export const MAX_LATTICE_WORK = 5e7;

/**
 * Points intérieurs (x, y, 2 par point), rangée par rangée du bas vers le haut, de gauche à droite. Les abscisses sont
 * x0 + décalage + i·h (indice entier). `maxPoints` : au-delà de ce nombre de points, ou si la boîte englobante a trop
 * de candidats, `DrapeTooLargeError`.
 */
export function interiorLattice(
  boundary: Float64Array,
  edgeMm: number,
  maxPoints = MAX_VERTICES_PER_GARMENT,
): Float64Array {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < boundary.length; i += 2) {
    x0 = Math.min(x0, boundary[i] as number);
    x1 = Math.max(x1, boundary[i] as number);
    y0 = Math.min(y0, boundary[i + 1] as number);
    y1 = Math.max(y1, boundary[i + 1] as number);
  }
  const out: number[] = [];
  const minDistance = MIN_BOUNDARY_DISTANCE_RATIO * edgeMm;
  const rows = Math.floor((y1 - y0) / (SQRT3_2 * edgeMm));
  const cols = Math.floor((x1 - x0) / edgeMm) + 1;
  assertVertexBudget(rows * cols, MAX_LATTICE_WORK / Math.max(1, boundary.length / 2));
  for (let j = 1; j <= rows; j++) {
    const y = y0 + j * SQRT3_2 * edgeMm;
    const start = x0 + (j % 2 === 1 ? edgeMm / 2 : 0);
    for (let i = 0; start + i * edgeMm <= x1; i++) {
      const x = start + i * edgeMm;
      if (!isInteriorPoint(boundary, x, y, minDistance)) continue;
      out.push(x, y);
      assertVertexBudget(out.length / 2, maxPoints);
    }
  }
  return Float64Array.from(out);
}
