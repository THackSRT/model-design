// Aire de l'ombre : union des triangles projetés sur le plan (x, z), par carte binaire de cellules.

/**
 * Aire de l'union des triangles projetés sur (x, z), en mm². Une cellule de `cellMm` compte si son centre est
 * dans un triangle (bords inclus) ; les recouvrements (plis) sont comptés une fois.
 */
export function projectedAreaMm2(
  positionsMm: Float64Array,
  triangles: Uint32Array,
  cellMm = 1,
): number {
  if (!(cellMm > 0)) throw new RangeError('cellMm must be positive');
  if (triangles.length === 0) return 0;
  const g = (i: number, k: number): number => positionsMm[3 * i + k] as number;
  let [minX, maxX, minZ, maxZ] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i < positionsMm.length / 3; i++) {
    minX = Math.min(minX, g(i, 0));
    maxX = Math.max(maxX, g(i, 0));
    minZ = Math.min(minZ, g(i, 2));
    maxZ = Math.max(maxZ, g(i, 2));
  }
  const width = Math.ceil((maxX - minX) / cellMm) + 1;
  const height = Math.ceil((maxZ - minZ) / cellMm) + 1;
  const covered = new Uint8Array(width * height);
  for (let t = 0; t < triangles.length; t += 3) {
    const v = [triangles[t], triangles[t + 1], triangles[t + 2]] as [number, number, number];
    fillTriangle(covered, { x0: minX, z0: minZ, cell: cellMm, width, height }, [
      [g(v[0], 0), g(v[0], 2)],
      [g(v[1], 0), g(v[1], 2)],
      [g(v[2], 0), g(v[2], 2)],
    ]);
  }
  let count = 0;
  for (let i = 0; i < covered.length; i++) count += covered[i] as number;
  return count * cellMm * cellMm;
}

type Point = readonly [number, number];

interface Grid {
  x0: number;
  z0: number;
  cell: number;
  width: number;
  height: number;
}

function fillTriangle(covered: Uint8Array, grid: Grid, tri: readonly [Point, Point, Point]): void {
  const { x0, z0, cell, width, height } = grid;
  const [a, b, c] = tri;
  const area2 = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  if (area2 === 0) return;
  const sign = area2 > 0 ? 1 : -1;
  const lo = (k: 0 | 1, origin: number): number =>
    Math.max(0, Math.floor((Math.min(a[k], b[k], c[k]) - origin) / cell) - 1);
  const hi = (k: 0 | 1, origin: number, size: number): number =>
    Math.min(size - 1, Math.ceil((Math.max(a[k], b[k], c[k]) - origin) / cell) + 1);
  const edge = (p: Point, q: Point, x: number, z: number): number =>
    sign * ((q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0]));
  for (let j = lo(1, z0); j <= hi(1, z0, height); j++) {
    const z = z0 + (j + 0.5) * cell;
    for (let i = lo(0, x0); i <= hi(0, x0, width); i++) {
      const x = x0 + (i + 0.5) * cell;
      if (edge(a, b, x, z) >= 0 && edge(b, c, x, z) >= 0 && edge(c, a, x, z) >= 0) {
        covered[j * width + i] = 1;
      }
    }
  }
}
