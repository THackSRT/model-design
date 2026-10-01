import { type BodyGrid, hashCell } from './body-grid.js';
import { closestPointOnTriangle, TRIANGLE_WORK_SIZE } from './triangle-distance.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;
const u = (a: Uint32Array, i: number): number => a[i] as number;

/** Résultat d'une requête : [0] distance, [1..3] point le plus proche, [4..6] normale de la face, [7] distance signée, [8] triangle. */
export const NEAREST_SIZE = 9;
/** Tampon de travail : celui du triangle, plus [11] meilleur carré de distance, [12] trouvé (0 ou 1). */
export const WORK_SIZE = TRIANGLE_WORK_SIZE + 2;
const BEST = TRIANGLE_WORK_SIZE;
const FOUND = TRIANGLE_WORK_SIZE + 1;

/** Carré de la distance de p au plan du triangle t (0 si le triangle est dégénéré). */
function planeDistance2(grid: BodyGrid, t: number, p: Float64Array): number {
  const a = 3 * u(grid.body.triangles, 3 * t);
  const pos = grid.body.positionsMm;
  const d =
    f(grid.normals, 3 * t) * (f(p, 0) - f(pos, a)) +
    f(grid.normals, 3 * t + 1) * (f(p, 1) - f(pos, a + 1)) +
    f(grid.normals, 3 * t + 2) * (f(p, 2) - f(pos, a + 2));
  return d * d;
}

/** Vrai si la sphère englobante du triangle est trop loin pour améliorer la meilleure distance. */
function farByBoundingSphere(
  grid: BodyGrid,
  t: number,
  p: Float64Array,
  bestSqrt: number,
): boolean {
  const dx = f(p, 0) - f(grid.centers, 3 * t);
  const dy = f(p, 1) - f(grid.centers, 3 * t + 1);
  const dz = f(p, 2) - f(grid.centers, 3 * t + 2);
  const reach = f(grid.radii, t) + bestSqrt;
  return dx * dx + dy * dy + dz * dz >= reach * reach;
}

function storeNearest(
  grid: BodyGrid,
  t: number,
  p: Float64Array,
  buffers: { work: Float64Array; out: Float64Array },
): void {
  const { work, out } = buffers;
  const dx = f(p, 0) - f(work, 0);
  const dy = f(p, 1) - f(work, 1);
  const dz = f(p, 2) - f(work, 2);
  const nx = f(grid.normals, 3 * t);
  const ny = f(grid.normals, 3 * t + 1);
  const nz = f(grid.normals, 3 * t + 2);
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const along = dx * nx + dy * ny + dz * nz;
  out[0] = dist;
  out[1] = f(work, 0);
  out[2] = f(work, 1);
  out[3] = f(work, 2);
  out[4] = nx;
  out[5] = ny;
  out[6] = nz;
  out[7] = along >= 0 ? dist : -dist;
  out[8] = t;
}

/** Examine le triangle t : s'il est plus proche que le meilleur, il devient le meilleur. */
function consider(
  grid: BodyGrid,
  t: number,
  p: Float64Array,
  buffers: { work: Float64Array; out: Float64Array },
): void {
  const { work } = buffers;
  const best = f(work, BEST);
  if (farByBoundingSphere(grid, t, p, Math.sqrt(best)) || planeDistance2(grid, t, p) >= best)
    return;
  closestPointOnTriangle(grid.body, t, p, work);
  const dx = f(p, 0) - f(work, 0);
  const dy = f(p, 1) - f(work, 1);
  const dz = f(p, 2) - f(work, 2);
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 >= best) return;
  work[BEST] = d2;
  work[FOUND] = 1;
  storeNearest(grid, t, p, buffers);
}

/**
 * Triangle du corps le plus proche de p à moins de `rangeMm` (parmi ceux de sa case), distance signée par la normale
 * de la face. `hint` : triangle trouvé à la requête précédente (-1 si aucun), examiné en premier pour resserrer la
 * recherche. Rend false si rien n'est à portée.
 */
export function nearestOnBody(
  grid: BodyGrid,
  p: Float64Array,
  hint: number,
  buffers: { work: Float64Array; out: Float64Array },
): boolean {
  const { work } = buffers;
  const cell = grid.cellMm;
  const bucket = hashCell(
    Math.floor(f(p, 0) / cell),
    Math.floor(f(p, 1) / cell),
    Math.floor(f(p, 2) / cell),
    grid.tableSize,
  );
  work[BEST] = grid.rangeMm * grid.rangeMm;
  work[FOUND] = 0;
  if (hint >= 0) consider(grid, hint, p, buffers);
  for (let i = u(grid.bucketStart, bucket); i < u(grid.bucketStart, bucket + 1); i++) {
    const t = u(grid.items, i);
    if (t !== hint) consider(grid, t, p, buffers);
  }
  return f(work, FOUND) > 0;
}
