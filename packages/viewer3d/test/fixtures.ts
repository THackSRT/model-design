import type { MeshData } from '../src/scene.js';

/** Rectangle plein dans le plan X/Y (z = 0), de x0..x1 et y0..y1, en deux triangles. */
export function rectangle(x0: number, y0: number, x1: number, y1: number): MeshData {
  return {
    positions: Float32Array.of(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0),
    index: Uint32Array.of(0, 1, 2, 0, 2, 3),
  };
}

/** Réunit des maillages (les index sont décalés). */
export function merge(...meshes: MeshData[]): MeshData {
  const positions: number[] = [];
  const index: number[] = [];
  for (const m of meshes) {
    const offset = positions.length / 3;
    for (const v of m.positions) positions.push(v);
    for (const i of m.index) index.push(i + offset);
  }
  return { positions: Float32Array.from(positions), index: Uint32Array.from(index) };
}

/** Grille de n × n cases (2 triangles par case) sur 30 × 170 cm : stress de performance. */
export function grid(n: number): MeshData {
  const cells = Array.from({ length: n * n }, (_, k) => {
    const x = (k % n) * (30 / n);
    const y = Math.floor(k / n) * (170 / n);
    return rectangle(x, y, x + 30 / n, y + 170 / n);
  });
  return merge(...cells);
}

/** Coordonnées [x, y] d'un chemin SVG produit par `silhouettePaths` (M/L/Z, sans courbes). */
export function parsePoints(d: string): [number, number][] {
  return [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}
