import type { Mask } from './raster.js';

/** Point d'un contour en demi-pixels : le centre du pixel (col, row) est en (2col + 1, 2row + 1). */
export type Point = readonly [number, number];

const pixel = (mask: Mask, col: number, row: number): number =>
  col < 0 || row < 0 || col >= mask.width || row >= mask.height
    ? 0
    : (mask.data[row * mask.width + col] ?? 0);

/** Segments orientés (haut T, droite R, bas B, gauche L) par configuration tl·8 + tr·4 + br·2 + bl. */
const CASES: Record<number, readonly (readonly [string, string])[]> = {
  1: [['L', 'B']],
  2: [['B', 'R']],
  3: [['L', 'R']],
  4: [['R', 'T']],
  5: [
    ['L', 'T'],
    ['R', 'B'],
  ],
  6: [['B', 'T']],
  7: [['L', 'T']],
  8: [['T', 'L']],
  9: [['T', 'B']],
  10: [
    ['T', 'R'],
    ['B', 'L'],
  ],
  11: [['T', 'R']],
  12: [['R', 'L']],
  13: [['R', 'B']],
  14: [['B', 'L']],
};

function midpoint(name: string, col: number, row: number): Point {
  if (name === 'T') return [2 * col + 2, 2 * row + 1];
  if (name === 'R') return [2 * col + 3, 2 * row + 2];
  if (name === 'B') return [2 * col + 2, 2 * row + 3];
  return [2 * col + 1, 2 * row + 2];
}

interface Segments {
  key: (p: Point) => number;
  next: Map<number, Point>;
}

/** Segments orientés du contour : chaque milieu d'arête a exactement un segment entrant et un sortant. */
function collectSegments(mask: Mask): Segments {
  const stride = 2 * mask.width + 8;
  const key = (p: Point) => (p[1] + 2) * stride + p[0] + 2;
  const next = new Map<number, Point>();
  for (let row = -1; row < mask.height; row++) {
    for (let col = -1; col < mask.width; col++) {
      const c =
        pixel(mask, col, row) * 8 +
        pixel(mask, col + 1, row) * 4 +
        pixel(mask, col + 1, row + 1) * 2 +
        pixel(mask, col, row + 1);
      for (const [from, to] of CASES[c] ?? []) {
        next.set(key(midpoint(from, col, row)), midpoint(to, col, row));
      }
    }
  }
  return { key, next };
}

/** Contours fermés du masque (sens horaire pour l'extérieur, antihoraire pour les trous). */
export function traceContours(mask: Mask): Point[][] {
  const { key, next } = collectSegments(mask);
  const loops: Point[][] = [];
  for (const [startKey, startTo] of next) {
    if (!next.has(startKey)) continue;
    const loop: Point[] = [];
    let k = startKey;
    let to: Point | undefined = startTo;
    while (to && next.has(k)) {
      next.delete(k);
      loop.push(to);
      k = key(to);
      to = next.get(k);
    }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}
