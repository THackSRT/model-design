import type { BodyGrid } from './body-grid.js';
import { closestPointOnTriangle } from './triangle-distance.js';
import type { BodyMesh } from './types.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;
const u = (a: Uint32Array, i: number): number => a[i] as number;

/**
 * Direction du rayon (1 sur Y), légèrement inclinée sur les axes pour éviter arêtes et sommets alignés avec les
 * axes du maillage. Fixe : le résultat ne dépend que du point et du corps.
 */
const SLOPE_X = 0.013712;
const SLOPE_Z = 0.009137;
/** Nombre maximal de cases par axe de la grille 2D. */
const MAX_CELLS_PER_AXIS = 512;
/** Valeurs stockées par triangle : origine 2D (2), arêtes 2D (4), inverse du déterminant, y du sommet a, deltas y (2). */
const STRIDE = 10;

/**
 * Test « point dans corps fermé » par parité : un rayon de direction fixe croise le maillage un nombre impair de
 * fois si et seulement si le point est dedans. Les triangles sont projetés le long du rayon (cisaillement) sur un
 * plan 2D, rangés dans une grille régulière. Ne sert que `+ − × ÷` et `Math.sqrt` : déterministe.
 */
export interface InsideTest {
  /** 6 valeurs de bornes 2D (minU, minW, cellule, nx, ny, vide si 0) puis la grille. */
  frame: Float64Array;
  tris: Float64Array;
  cellStart: Uint32Array;
  items: Uint32Array;
}

const FRAME_MIN_U = 0;
const FRAME_MIN_W = 1;
const FRAME_CELL = 2;
const FRAME_NX = 3;
const FRAME_NY = 4;

interface Bounds2D {
  minU: number;
  minW: number;
  maxU: number;
  maxW: number;
  meanExtent: number;
}

/** Projette le triangle t le long du rayon dans q : (u, w, y) de chacun des trois sommets. */
function projectVertices(body: BodyMesh, t: number, q: Float64Array): void {
  const p = body.positionsMm;
  for (let j = 0; j < 3; j++) {
    const v = 3 * u(body.triangles, 3 * t + j);
    q[3 * j] = f(p, v) - SLOPE_X * f(p, v + 1);
    q[3 * j + 1] = f(p, v + 2) - SLOPE_Z * f(p, v + 1);
    q[3 * j + 2] = f(p, v + 1);
  }
}

/** Écrit les STRIDE valeurs du triangle projeté q à l'indice o de tris. */
function storeTriangle(tris: Float64Array, o: number, q: Float64Array): void {
  const e1u = f(q, 3) - f(q, 0);
  const e1w = f(q, 4) - f(q, 1);
  const e2u = f(q, 6) - f(q, 0);
  const e2w = f(q, 7) - f(q, 1);
  const det = e1u * e2w - e1w * e2u;
  tris.set([f(q, 0), f(q, 1), e1u, e1w, e2u, e2w, det === 0 ? 0 : 1 / det], o);
  tris.set([f(q, 2), f(q, 5) - f(q, 2), f(q, 8) - f(q, 2)], o + 7);
}

function projectTriangles(body: BodyMesh): { tris: Float64Array; bounds: Bounds2D } {
  const n = body.triangles.length / 3;
  const tris = new Float64Array(STRIDE * n);
  const q = new Float64Array(9);
  const b: Bounds2D = {
    minU: Infinity,
    minW: Infinity,
    maxU: -Infinity,
    maxW: -Infinity,
    meanExtent: 0,
  };
  for (let t = 0; t < n; t++) {
    projectVertices(body, t, q);
    storeTriangle(tris, STRIDE * t, q);
    const [loU, loW, hiU, hiW] = triangleBounds(q) as [number, number, number, number];
    b.minU = Math.min(b.minU, loU);
    b.minW = Math.min(b.minW, loW);
    b.maxU = Math.max(b.maxU, hiU);
    b.maxW = Math.max(b.maxW, hiW);
    b.meanExtent += Math.max(hiU - loU, hiW - loW);
  }
  b.meanExtent /= Math.max(1, n);
  return { tris, bounds: b };
}

/** [minU, minW, maxU, maxW] d'un triangle projeté. */
function triangleBounds(q: Float64Array): number[] {
  return [
    Math.min(f(q, 0), f(q, 3), f(q, 6)),
    Math.min(f(q, 1), f(q, 4), f(q, 7)),
    Math.max(f(q, 0), f(q, 3), f(q, 6)),
    Math.max(f(q, 1), f(q, 4), f(q, 7)),
  ];
}

/** Plage de cases [i0, i1, j0, j1] couverte par la boîte 2D du triangle t. */
function cellSpan(test: InsideTest, t: number, out: Int32Array): void {
  const { frame, tris } = test;
  const o = STRIDE * t;
  const au = f(tris, o);
  const aw = f(tris, o + 1);
  const bu = au + f(tris, o + 2);
  const bw = aw + f(tris, o + 3);
  const cu = au + f(tris, o + 4);
  const cw = aw + f(tris, o + 5);
  const cell = f(frame, FRAME_CELL);
  const nx = f(frame, FRAME_NX);
  const ny = f(frame, FRAME_NY);
  const clamp = (x: number, n: number): number => Math.max(0, Math.min(n - 1, x));
  out[0] = clamp(Math.floor((Math.min(au, bu, cu) - f(frame, FRAME_MIN_U)) / cell), nx);
  out[1] = clamp(Math.floor((Math.max(au, bu, cu) - f(frame, FRAME_MIN_U)) / cell), nx);
  out[2] = clamp(Math.floor((Math.min(aw, bw, cw) - f(frame, FRAME_MIN_W)) / cell), ny);
  out[3] = clamp(Math.floor((Math.max(aw, bw, cw) - f(frame, FRAME_MIN_W)) / cell), ny);
}

/** Appelle `visit` pour chaque case de la grille couverte par la boîte 2D du triangle t. */
function forEachCell(test: InsideTest, t: number, visit: (cell: number) => void): void {
  const span = new Int32Array(4);
  const nx = f(test.frame, FRAME_NX);
  cellSpan(test, t, span);
  for (let j = span[2] as number; j <= (span[3] as number); j++) {
    for (let i = span[0] as number; i <= (span[1] as number); i++) visit(j * nx + i);
  }
}

/** Remplit `cellStart` (sommes cumulées) puis `items` : tri par comptage, ordre des triangles. */
function fillCells(test: InsideTest, triCount: number): InsideTest {
  const cells = test.cellStart.length - 1;
  for (let t = 0; t < triCount; t++) {
    forEachCell(test, t, (c) => {
      test.cellStart[c + 1] = u(test.cellStart, c + 1) + 1;
    });
  }
  for (let c = 0; c < cells; c++)
    test.cellStart[c + 1] = u(test.cellStart, c + 1) + u(test.cellStart, c);
  const filled: InsideTest = { ...test, items: new Uint32Array(u(test.cellStart, cells)) };
  const cursor = test.cellStart.slice();
  for (let t = 0; t < triCount; t++) {
    forEachCell(filled, t, (c) => {
      filled.items[u(cursor, c)] = t;
      cursor[c] = u(cursor, c) + 1;
    });
  }
  return filled;
}

/** Prépare le test pour un corps fermé (statique). Un corps vide ne contient rien. */
export function createInsideTest(body: BodyMesh): InsideTest {
  const triCount = body.triangles.length / 3;
  const { tris, bounds: b } = projectTriangles(body);
  const range = Math.max(b.maxU - b.minU, b.maxW - b.minW);
  const cell = Math.max(b.meanExtent, range / MAX_CELLS_PER_AXIS, 1e-6);
  const nx = triCount === 0 ? 0 : Math.floor((b.maxU - b.minU) / cell) + 1;
  const ny = triCount === 0 ? 0 : Math.floor((b.maxW - b.minW) / cell) + 1;
  const frame = Float64Array.of(b.minU, b.minW, cell, nx, ny);
  return fillCells(
    { frame, tris, cellStart: new Uint32Array(nx * ny + 1), items: new Uint32Array(0) },
    triCount,
  );
}

/** Vrai si le rayon issu de (px, py, pz) croise le triangle t (point 2D dans le triangle projeté, au-dessus de py). */
function crosses(test: InsideTest, t: number, q: { u: number; w: number; y: number }): boolean {
  const tris = test.tris;
  const o = STRIDE * t;
  const inv = f(tris, o + 6);
  if (inv === 0) return false;
  const du = q.u - f(tris, o);
  const dw = q.w - f(tris, o + 1);
  const s = (du * f(tris, o + 5) - dw * f(tris, o + 4)) * inv;
  const r = (f(tris, o + 2) * dw - f(tris, o + 3) * du) * inv;
  if (!(s >= 0 && r >= 0 && s + r < 1)) return false;
  return f(tris, o + 7) + s * f(tris, o + 8) + r * f(tris, o + 9) > q.y;
}

/** Vrai si le point (x, y, z) est dans le corps (parité du nombre de croisements). */
export function isInsideBody(test: InsideTest, x: number, y: number, z: number): boolean {
  const { frame } = test;
  const nx = f(frame, FRAME_NX);
  const ny = f(frame, FRAME_NY);
  if (nx === 0) return false;
  const q = { u: x - SLOPE_X * y, w: z - SLOPE_Z * y, y };
  const cell = f(frame, FRAME_CELL);
  const i = Math.floor((q.u - f(frame, FRAME_MIN_U)) / cell);
  const j = Math.floor((q.w - f(frame, FRAME_MIN_W)) / cell);
  if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
  let odd = false;
  for (let k = u(test.cellStart, j * nx + i); k < u(test.cellStart, j * nx + i + 1); k++) {
    if (crosses(test, u(test.items, k), q)) odd = !odd;
  }
  return odd;
}

/**
 * Distance (mm) de p à la surface du corps, sans limite de portée : tous les triangles, écartés par leur sphère
 * englobante tant qu'un meilleur candidat existe. `p` : 3 valeurs.
 */
export function distanceToSurface(grid: BodyGrid, p: Float64Array, work: Float64Array): number {
  let best = Infinity;
  for (let t = 0; t < grid.radii.length; t++) {
    const dx = f(p, 0) - f(grid.centers, 3 * t);
    const dy = f(p, 1) - f(grid.centers, 3 * t + 1);
    const dz = f(p, 2) - f(grid.centers, 3 * t + 2);
    const reach = f(grid.radii, t) + best;
    if (dx * dx + dy * dy + dz * dz >= reach * reach) continue;
    closestPointOnTriangle(grid.body, t, p, work);
    const ex = f(p, 0) - f(work, 0);
    const ey = f(p, 1) - f(work, 1);
    const ez = f(p, 2) - f(work, 2);
    const d = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (d < best) best = d; // triangle dégénéré (NaN) ignoré
  }
  return best;
}
