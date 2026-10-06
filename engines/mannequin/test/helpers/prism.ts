/*
 * Solides de synthèse pour tester les coupes sans les données MakeHuman : un polygone simple étiré en prisme
 * fermé (parois et deux bouchons triangulés), placé dans l'espace par `place`.
 */
export type Point2 = [number, number];

export interface Solid {
  pos: Float32Array;
  tris: Uint16Array;
}

const at = <T>(a: readonly T[], i: number): T => a[i] as T;

const turn = (o: Point2, a: Point2, b: Point2): number =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

const insideTriangle = (p: Point2, a: Point2, b: Point2, c: Point2): boolean =>
  turn(a, b, p) >= 0 && turn(b, c, p) >= 0 && turn(c, a, p) >= 0;

/** Triangulation d'un polygone simple par découpe d'oreilles (indices des sommets, sens direct). */
export function triangulate(poly: Point2[]): [number, number, number][] {
  const signed = poly.reduce((s, p, i) => {
    const q = at(poly, (i + 1) % poly.length);
    return s + p[0] * q[1] - q[0] * p[1];
  }, 0);
  const ring = poly.map((_, i) => i);
  if (signed < 0) ring.reverse();
  const out: [number, number, number][] = [];
  while (ring.length > 3) {
    const k = ring.findIndex((_, i) => {
      const [i0, i1, i2] = [
        at(ring, (i + ring.length - 1) % ring.length),
        at(ring, i),
        at(ring, (i + 1) % ring.length),
      ];
      const [a, b, c] = [at(poly, i0), at(poly, i1), at(poly, i2)];
      if (turn(a, b, c) <= 0) return false;
      return !ring.some(
        (j) => j !== i0 && j !== i1 && j !== i2 && insideTriangle(at(poly, j), a, b, c),
      );
    });
    if (k < 0) throw new Error('polygone non triangulable');
    out.push([
      at(ring, (k + ring.length - 1) % ring.length),
      at(ring, k),
      at(ring, (k + 1) % ring.length),
    ]);
    ring.splice(k, 1);
  }
  out.push([at(ring, 0), at(ring, 1), at(ring, 2)]);
  return out;
}

/**
 * Prisme fermé : le polygone (a, b) étiré de 0 à `depth` selon c ; `place(a, b, c)` donne la position (x, y, z).
 */
export function prism(
  poly: Point2[],
  depth: number,
  place: (a: number, b: number, c: number) => [number, number, number],
): Solid {
  const n = poly.length;
  const pos: number[] = [];
  for (const c of [0, depth]) for (const [a, b] of poly) pos.push(...place(a, b, c));
  const tris: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push(i, j, n + j, i, n + j, n + i);
  }
  for (const [i, j, k] of triangulate(poly)) tris.push(i, j, k, n + i, n + j, n + k);
  return { pos: Float32Array.from(pos), tris: Uint16Array.from(tris) };
}
