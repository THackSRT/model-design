import type { Edge, Panel, Point } from '@atelier/contracts-ts';
import type { PanelMesh } from '../src/index.js';

/** Pièce à bords droits à partir d'un polygone antihoraire. */
export function polygonPanel(points: readonly Point[], id = 'p'): Panel {
  const edges: Edge[] = points.map((from, i) => ({
    id: `e${i}`,
    from,
    to: points[(i + 1) % points.length] as Point,
  }));
  return panelOf(id, edges);
}

export function rectPanel(w: number, h: number): Panel {
  return polygonPanel([
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ]);
}

export function polygonArea(points: readonly Point[]): number {
  let s = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length] as Point;
    s += p[0] * q[1] - q[0] * p[1];
  });
  return s / 2;
}

const at = (m: PanelMesh, v: number): Point => [
  m.positionsMm[2 * v] as number,
  m.positionsMm[2 * v + 1] as number,
];

export interface MeshStats {
  area: number;
  minTriangleArea: number;
  maxEdge: number;
  minAngleDeg: number;
  usedVertices: number;
}

export function meshStats(m: PanelMesh): MeshStats {
  let area = 0;
  let minTriangleArea = Infinity;
  let maxEdge = 0;
  let minAngle = Infinity;
  const used = new Set<number>();
  for (let t = 0; t < m.triangles.length; t += 3) {
    const v = [0, 1, 2].map((k) => m.triangles[t + k] as number);
    v.forEach((i) => used.add(i));
    const [a, b, c] = v.map((i) => at(m, i)) as [Point, Point, Point];
    const ar = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
    area += ar;
    minTriangleArea = Math.min(minTriangleArea, ar);
    const len = [Math.hypot(...sub(b, a)), Math.hypot(...sub(c, b)), Math.hypot(...sub(a, c))];
    maxEdge = Math.max(maxEdge, ...len);
    const [la, lb, lc] = len as [number, number, number];
    for (const [x, y, z] of [
      [la, lb, lc],
      [lb, lc, la],
      [lc, la, lb],
    ] as const) {
      minAngle = Math.min(
        minAngle,
        (Math.acos((x * x + y * y - z * z) / (2 * x * y)) * 180) / Math.PI,
      );
    }
  }
  return { area, minTriangleArea, maxEdge, minAngleDeg: minAngle, usedVertices: used.size };
}

function sub(a: Point, b: Point): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}

/** Distance du point p au segment [a, b]. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const [ex, ey] = sub(b, a);
  const t = Math.min(
    1,
    Math.max(0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey)),
  );
  return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey);
}

export function vertexAt(m: PanelMesh, v: number): Point {
  return at(m, v);
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) pour les tests de propriétés. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sameBitsOf(a: Float64Array, b: Float64Array): boolean {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(
    Buffer.from(b.buffer, b.byteOffset, b.byteLength),
  );
}

/** Pièce à partir de bords (au moins trois, comme l'exige le contrat). */
export function panelOf(id: string, edges: Edge[]): Panel {
  return { id, name: id, edges: edges as Panel['edges'], quantity: 1 };
}
