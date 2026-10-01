import type { BodyMesh } from './types.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;
const u = (a: Uint32Array, i: number): number => a[i] as number;

/** Grille de hachage spatial du corps (statique) : chaque triangle est inscrit dans les cases qu'il touche, élargi de la portée. */
export interface BodyGrid {
  body: BodyMesh;
  normals: Float64Array;
  /** Centre (3 valeurs) et rayon (1) de la sphère englobante de chaque triangle. */
  centers: Float64Array;
  radii: Float64Array;
  cellMm: number;
  /** Portée de capture : au-delà, un triangle est ignoré (il peut venir d'une case voisine par collision de hachage). */
  rangeMm: number;
  tableSize: number;
  bucketStart: Uint32Array;
  items: Uint32Array;
}

export function hashCell(ix: number, iy: number, iz: number, size: number): number {
  return (
    ((Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) >>> 0) % size
  );
}

function triangleNormals(body: BodyMesh): Float64Array {
  const n = body.triangles.length / 3;
  const out = new Float64Array(3 * n);
  const p = body.positionsMm;
  for (let t = 0; t < n; t++) {
    const [a, b, c] = [
      u(body.triangles, 3 * t),
      u(body.triangles, 3 * t + 1),
      u(body.triangles, 3 * t + 2),
    ];
    const ux = f(p, 3 * b) - f(p, 3 * a);
    const uy = f(p, 3 * b + 1) - f(p, 3 * a + 1);
    const uz = f(p, 3 * b + 2) - f(p, 3 * a + 2);
    const vx = f(p, 3 * c) - f(p, 3 * a);
    const vy = f(p, 3 * c + 1) - f(p, 3 * a + 1);
    const vz = f(p, 3 * c + 2) - f(p, 3 * a + 2);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    out[3 * t] = len > 0 ? nx / len : 0;
    out[3 * t + 1] = len > 0 ? ny / len : 0;
    out[3 * t + 2] = len > 0 ? nz / len : 0;
  }
  return out;
}

/** Plage de cases [lo, hi] (par axe) couverte par un triangle élargi de `range`. */
function cellRange(
  body: BodyMesh,
  t: number,
  grid: { range: number; cell: number },
  out: Int32Array,
): void {
  const { range, cell } = grid;
  for (let k = 0; k < 3; k++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < 3; j++) {
      const v = f(body.positionsMm, 3 * u(body.triangles, 3 * t + j) + k);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    out[k] = Math.floor((lo - range) / cell);
    out[3 + k] = Math.floor((hi + range) / cell);
  }
}

/** Parcourt les cases d'un triangle ; `visit` reçoit le numéro de seau. */
function forEachBucket(
  grid: Pick<BodyGrid, 'tableSize'>,
  r: Int32Array,
  visit: (bucket: number) => void,
): void {
  for (let x = r[0] as number; x <= (r[3] as number); x++) {
    for (let y = r[1] as number; y <= (r[4] as number); y++) {
      for (let z = r[2] as number; z <= (r[5] as number); z++)
        visit(hashCell(x, y, z, grid.tableSize));
    }
  }
}

/** Longueur moyenne de la première arête des triangles : ordre de grandeur de la taille d'une case. */
function meanEdgeMm(body: BodyMesh): number {
  const tri = body.triangles;
  const p = body.positionsMm;
  let sum = 0;
  for (let t = 0; t < tri.length / 3; t++) {
    const a = 3 * u(tri, 3 * t);
    const b = 3 * u(tri, 3 * t + 1);
    const dx = f(p, a) - f(p, b);
    const dy = f(p, a + 1) - f(p, b + 1);
    const dz = f(p, a + 2) - f(p, b + 2);
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return sum / Math.max(1, tri.length / 3);
}

/** Centre (moyenne des sommets) et rayon englobant de chaque triangle. */
function boundingSpheres(body: BodyMesh): { centers: Float64Array; radii: Float64Array } {
  const n = body.triangles.length / 3;
  const centers = new Float64Array(3 * n);
  const radii = new Float64Array(n);
  const p = body.positionsMm;
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < 3; k++) {
      centers[3 * t + k] =
        (f(p, 3 * u(body.triangles, 3 * t) + k) +
          f(p, 3 * u(body.triangles, 3 * t + 1) + k) +
          f(p, 3 * u(body.triangles, 3 * t + 2) + k)) /
        3;
    }
    let r2 = 0;
    for (let j = 0; j < 3; j++) {
      const v = 3 * u(body.triangles, 3 * t + j);
      const d0 = f(p, v) - f(centers, 3 * t);
      const d1 = f(p, v + 1) - f(centers, 3 * t + 1);
      const d2 = f(p, v + 2) - f(centers, 3 * t + 2);
      r2 = Math.max(r2, d0 * d0 + d1 * d1 + d2 * d2);
    }
    radii[t] = Math.sqrt(r2);
  }
  return { centers, radii };
}

/** Nombre total d'inscriptions triangle-case (taille de la table des éléments). */
function countInsertions(body: BodyMesh, spec: { range: number; cell: number }): number {
  const r = new Int32Array(6);
  let total = 0;
  for (let t = 0; t < body.triangles.length / 3; t++) {
    cellRange(body, t, spec, r);
    total +=
      ((r[3] as number) - (r[0] as number) + 1) *
      ((r[4] as number) - (r[1] as number) + 1) *
      ((r[5] as number) - (r[2] as number) + 1);
  }
  return total;
}

/** Remplit les seaux : comptage, sommes cumulées, puis inscription des triangles (tri par comptage, ordre fixe). */
function fillBuckets(grid: BodyGrid, spec: { range: number; cell: number }): void {
  const { bucketStart, tableSize } = grid;
  const r = new Int32Array(6);
  const triCount = grid.body.triangles.length / 3;
  for (let t = 0; t < triCount; t++) {
    cellRange(grid.body, t, spec, r);
    forEachBucket(grid, r, (b) => {
      bucketStart[b + 1] = u(bucketStart, b + 1) + 1;
    });
  }
  for (let b = 0; b < tableSize; b++)
    bucketStart[b + 1] = u(bucketStart, b + 1) + u(bucketStart, b);
  const fill = bucketStart.slice(0, tableSize);
  for (let t = 0; t < triCount; t++) {
    cellRange(grid.body, t, spec, r);
    forEachBucket(grid, r, (b) => {
      grid.items[u(fill, b)] = t;
      fill[b] = u(fill, b) + 1;
    });
  }
}

export function buildBodyGrid(body: BodyMesh, rangeMm: number): BodyGrid {
  const cellMm = Math.max(rangeMm, meanEdgeMm(body));
  const spec = { range: rangeMm, cell: cellMm };
  const total = countInsertions(body, spec);
  const tableSize = Math.max(1031, 2 * total + 1);
  const grid: BodyGrid = {
    body,
    normals: triangleNormals(body),
    ...boundingSpheres(body),
    cellMm,
    rangeMm,
    tableSize,
    bucketStart: new Uint32Array(tableSize + 1),
    items: new Uint32Array(total),
  };
  fillBuckets(grid, spec);
  return grid;
}
