import type { BodyMesh } from './types.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

/** Tampon de travail : [0..2] point le plus proche, [3..4] coordonnées (v, w), [5..10] produits scalaires d1..d6. */
export const TRIANGLE_WORK_SIZE = 11;

/** Région de sommet (Ericson 2005) : 0 = a, 1 = b, 2 = c, -1 = aucune. */
function vertexRegion(w: Float64Array): number {
  if (f(w, 5) <= 0 && f(w, 6) <= 0) return 0;
  if (f(w, 7) >= 0 && f(w, 8) <= f(w, 7)) return 1;
  if (f(w, 10) >= 0 && f(w, 9) <= f(w, 10)) return 2;
  return -1;
}

/** Arête ou face : écrit (v, w) tels que le point soit a + v·ab + w·ac. */
function edgeOrFace(work: Float64Array): void {
  const d1 = f(work, 5);
  const d2 = f(work, 6);
  const d3 = f(work, 7);
  const d4 = f(work, 8);
  const d5 = f(work, 9);
  const d6 = f(work, 10);
  const vc = d1 * d4 - d3 * d2;
  const vb = d5 * d2 - d1 * d6;
  const va = d3 * d6 - d5 * d4;
  let v: number;
  let w: number;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    v = d1 / (d1 - d3);
    w = 0;
  } else if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    v = 0;
    w = d2 / (d2 - d6);
  } else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    v = 1 - w;
  } else {
    const inv = 1 / (va + vb + vc);
    v = vb * inv;
    w = vc * inv;
  }
  work[3] = v;
  work[4] = w;
}

/**
 * Point du triangle (ia, ib, ic) le plus proche de p, écrit dans `work[0..2]`. Les sommets sont lus dans `pos`
 * (3 valeurs par sommet). Aucune allocation.
 */
export function closestPointOnTriangle(
  body: BodyMesh,
  t: number,
  p: Float64Array,
  work: Float64Array,
): void {
  const pos = body.positionsMm;
  const tri = body.triangles;
  const ia = 3 * (tri[3 * t] as number);
  const ib = 3 * (tri[3 * t + 1] as number);
  const ic = 3 * (tri[3 * t + 2] as number);
  const ax = f(pos, ia);
  const ay = f(pos, ia + 1);
  const az = f(pos, ia + 2);
  const abx = f(pos, ib) - ax;
  const aby = f(pos, ib + 1) - ay;
  const abz = f(pos, ib + 2) - az;
  const acx = f(pos, ic) - ax;
  const acy = f(pos, ic + 1) - ay;
  const acz = f(pos, ic + 2) - az;
  const px = f(p, 0);
  const py = f(p, 1);
  const pz = f(p, 2);
  work[5] = abx * (px - ax) + aby * (py - ay) + abz * (pz - az);
  work[6] = acx * (px - ax) + acy * (py - ay) + acz * (pz - az);
  work[7] = abx * (px - f(pos, ib)) + aby * (py - f(pos, ib + 1)) + abz * (pz - f(pos, ib + 2));
  work[8] = acx * (px - f(pos, ib)) + acy * (py - f(pos, ib + 1)) + acz * (pz - f(pos, ib + 2));
  work[9] = abx * (px - f(pos, ic)) + aby * (py - f(pos, ic + 1)) + abz * (pz - f(pos, ic + 2));
  work[10] = acx * (px - f(pos, ic)) + acy * (py - f(pos, ic + 1)) + acz * (pz - f(pos, ic + 2));
  const region = vertexRegion(work);
  if (region >= 0) {
    work[3] = region === 1 ? 1 : 0;
    work[4] = region === 2 ? 1 : 0;
  } else edgeOrFace(work);
  const v = f(work, 3);
  const w = f(work, 4);
  work[0] = ax + v * abx + w * acx;
  work[1] = ay + v * aby + w * acy;
  work[2] = az + v * abz + w * acz;
}
