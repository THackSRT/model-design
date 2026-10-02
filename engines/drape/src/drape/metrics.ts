import { buildBodyGrid } from '../core/body-grid.js';
import { NEAREST_SIZE, WORK_SIZE, nearestOnBody } from '../core/body-query.js';
import { createInsideTest, distanceToSurface, isInsideBody } from '../core/inside.js';
import type { BodyMesh, ClothMesh } from '../core/types.js';

// Indicateurs du vêtement drapé : aisance (distance au corps moins l'épaisseur du tissu) et allongement par sommet.

/** Portée de la recherche exacte du triangle le plus proche, mm. */
const EASE_RANGE_MM = 60;

/** Distance (mm) du sommet p au sommet du corps le plus proche : borne haute de la distance au maillage. */
function farDistance(body: BodyMesh, p: Float64Array): number {
  let best = Infinity;
  const q = body.positionsMm;
  for (let i = 0; i < q.length; i += 3) {
    const dx = (q[i] as number) - (p[0] as number);
    const dy = (q[i + 1] as number) - (p[1] as number);
    const dz = (q[i + 2] as number) - (p[2] as number);
    best = Math.min(best, dx * dx + dy * dy + dz * dz);
  }
  return Math.sqrt(best);
}

/**
 * Aisance de chaque sommet, mm : distance signée au corps moins `thicknessMm`. Le signe vient du test de parité
 * (négatif dedans, sans limite de portée). Distance : exacte à moins de 60 mm de la surface ; au-delà, dehors, celle
 * du sommet du corps le plus proche (borne haute, à une demi-arête près, 4 mm) ; au-delà, dedans, celle de la surface.
 */
export function vertexEase(
  positionsMm: Float64Array,
  body: BodyMesh,
  thicknessMm: number,
): Float32Array {
  const grid = buildBodyGrid(body, EASE_RANGE_MM);
  const inside = createInsideTest(body);
  const work = new Float64Array(WORK_SIZE);
  const out = new Float64Array(NEAREST_SIZE);
  const p = new Float64Array(3);
  const ease = new Float32Array(positionsMm.length / 3);
  for (let v = 0; v < ease.length; v++) {
    for (let k = 0; k < 3; k++) p[k] = positionsMm[3 * v + k] as number;
    const within = isInsideBody(inside, p[0] as number, p[1] as number, p[2] as number);
    let dist: number;
    if (nearestOnBody(grid, p, -1, { work, out })) dist = out[0] as number;
    else dist = within ? distanceToSurface(grid, p, work) : farDistance(body, p);
    ease[v] = (within ? -dist : dist) - thicknessMm;
  }
  return ease;
}

/** Allongement relatif de chaque sommet : le plus grand de ses arêtes, (longueur − repos) / repos (0,01 = 1 %). */
export function vertexStrain(cloth: ClothMesh, positionsMm: Float64Array): Float32Array {
  const strain = new Float32Array(cloth.flatMm.length / 2).fill(-Infinity);
  const tri = cloth.triangles;
  const edge = (a: number, b: number): void => {
    const rest = Math.sqrt(
      ((cloth.flatMm[2 * a] as number) - (cloth.flatMm[2 * b] as number)) ** 2 +
        ((cloth.flatMm[2 * a + 1] as number) - (cloth.flatMm[2 * b + 1] as number)) ** 2,
    );
    const now = Math.sqrt(
      ((positionsMm[3 * a] as number) - (positionsMm[3 * b] as number)) ** 2 +
        ((positionsMm[3 * a + 1] as number) - (positionsMm[3 * b + 1] as number)) ** 2 +
        ((positionsMm[3 * a + 2] as number) - (positionsMm[3 * b + 2] as number)) ** 2,
    );
    if (rest <= 0) return;
    const s = (now - rest) / rest;
    strain[a] = Math.max(strain[a] as number, s);
    strain[b] = Math.max(strain[b] as number, s);
  };
  for (let t = 0; t < tri.length; t += 3) {
    const [a, b, c] = [tri[t] as number, tri[t + 1] as number, tri[t + 2] as number];
    edge(a, b);
    edge(b, c);
    edge(c, a);
  }
  return strain.map((s) => (Number.isFinite(s) ? s : 0));
}

/** Surface de chaque sommet : le tiers de celle de ses triangles, mm² (vêtement drapé, en 3D). */
export function vertexAreas(cloth: ClothMesh, positionsMm: Float64Array): Float64Array {
  const area = new Float64Array(cloth.flatMm.length / 2);
  const p = positionsMm;
  for (let t = 0; t < cloth.triangles.length; t += 3) {
    const [a, b, c] = [
      cloth.triangles[t],
      cloth.triangles[t + 1],
      cloth.triangles[t + 2],
    ] as number[];
    const u = [0, 1, 2].map(
      (k) => (p[3 * (b as number) + k] as number) - (p[3 * (a as number) + k] as number),
    );
    const w = [0, 1, 2].map(
      (k) => (p[3 * (c as number) + k] as number) - (p[3 * (a as number) + k] as number),
    );
    const x = (u[1] as number) * (w[2] as number) - (u[2] as number) * (w[1] as number);
    const y = (u[2] as number) * (w[0] as number) - (u[0] as number) * (w[2] as number);
    const z = (u[0] as number) * (w[1] as number) - (u[1] as number) * (w[0] as number);
    const third = Math.sqrt(x * x + y * y + z * z) / 6;
    for (const v of [a, b, c] as number[]) area[v] = (area[v] as number) + third;
  }
  return area;
}
