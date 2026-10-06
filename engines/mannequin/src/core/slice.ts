/*
 * Coupes planes du maillage de base : intersection avec un plan « axe = valeur », reliée en chaînes de points.
 * Une chaîne est fermée (contour) ou ouverte (le plan rencontre un bord du maillage). Unités : cm.
 */
import { hullPerimeter } from './geometry.js';
import type { Vec2, Vec3 } from './types.js';

/** Axe du plan de coupe : 0 = x (plan sagittal), 1 = y (plan horizontal), 2 = z (plan frontal). */
export type Axis = 0 | 1 | 2;

/** Points d'une coupe, dans l'ordre le long de la surface. */
export interface Chain {
  points: Vec3[];
  closed: boolean;
}

/** Points de coupe (un par arête coupée) et leurs voisins : chaque triangle coupé relie deux arêtes. */
interface Crossings {
  points: Vec3[];
  next: number[][];
}

const at = (a: ArrayLike<number>, i: number): number => a[i] as number;

/** Plan de coupe : « axe = valeur ». */
interface Plane {
  axis: Axis;
  level: number;
}

/** Point où l'arête (a, b) rencontre le plan : interpolation linéaire. */
function interpolate(pos: Float32Array, edge: [number, number], plane: Plane): Vec3 {
  const [a, b] = edge;
  const da = at(pos, 3 * a + plane.axis) - plane.level;
  const db = at(pos, 3 * b + plane.axis) - plane.level;
  const f = da / (da - db);
  const p = (q: number): number =>
    at(pos, 3 * a + q) + (at(pos, 3 * b + q) - at(pos, 3 * a + q)) * f;
  return [p(0), p(1), p(2)];
}

function crossings(pos: Float32Array, tris: ArrayLike<number>, plane: Plane): Crossings {
  const vertexCount = pos.length / 3;
  const found: Crossings = { points: [], next: [] };
  const byEdge = new Map<number, number>();
  const above = (v: number): boolean => at(pos, 3 * v + plane.axis) > plane.level;
  const crossing = (a: number, b: number): number => {
    const edge: [number, number] = [Math.min(a, b), Math.max(a, b)];
    const key = edge[0] * vertexCount + edge[1];
    let id = byEdge.get(key);
    if (id === undefined) {
      id = found.points.length;
      found.points.push(interpolate(pos, edge, plane));
      found.next.push([]);
      byEdge.set(key, id);
    }
    return id;
  };
  for (let t = 0; t < tris.length; t += 3) {
    const v = [at(tris, t), at(tris, t + 1), at(tris, t + 2)];
    const hits: number[] = [];
    for (let e = 0; e < 3; e++) {
      const a = at(v, e);
      const b = at(v, (e + 1) % 3);
      if (above(a) !== above(b)) hits.push(crossing(a, b));
    }
    if (hits.length !== 2) continue;
    (found.next[at(hits, 0)] as number[]).push(at(hits, 1));
    (found.next[at(hits, 1)] as number[]).push(at(hits, 0));
  }
  return found;
}

/** Suit les voisins non visités à partir de `start`. */
function walk(found: Crossings, seen: Uint8Array, start: number): number[] {
  const path = [start];
  seen[start] = 1;
  let current = start;
  for (;;) {
    const step = (found.next[current] as number[]).find((n) => !seen[n]);
    if (step === undefined) return path;
    seen[step] = 1;
    path.push(step);
    current = step;
  }
}

/**
 * Coupe du maillage (positions en cm, triangles en indices de sommets) par le plan « axe = level ».
 * Un sommet exactement dans le plan compte comme en dessous : la coupe ne dépend pas de l'ordre des triangles.
 */
export function sliceMesh(
  pos: Float32Array,
  tris: ArrayLike<number>,
  axis: Axis,
  level: number,
): Chain[] {
  const found = crossings(pos, tris, { axis, level });
  const seen = new Uint8Array(found.points.length);
  const chains: Chain[] = [];
  const emit = (path: number[], closed: boolean): void => {
    chains.push({ points: path.map((i) => found.points[i] as Vec3), closed });
  };
  found.next.forEach((n, i) => {
    if (n.length === 1 && !seen[i]) emit(walk(found, seen, i), false);
  });
  found.next.forEach((_, i) => {
    if (!seen[i]) emit(walk(found, seen, i), true);
  });
  return chains;
}

/** Triangles dont la hauteur recoupe [low, high] : une coupe de cette bande n'a pas besoin des autres. */
export function bandTriangles(
  pos: Float32Array,
  tris: ArrayLike<number>,
  low: number,
  high: number,
): number[] {
  const band: number[] = [];
  for (let t = 0; t < tris.length; t += 3) {
    const ys = [0, 1, 2].map((k) => at(pos, 3 * at(tris, t + k) + 1));
    if (Math.max(...ys) >= low && Math.min(...ys) <= high) {
      band.push(at(tris, t), at(tris, t + 1), at(tris, t + 2));
    }
  }
  return band;
}

/** Aire (valeur absolue) du polygone projeté sur les axes (a, b) : formule des lacets. */
export function planarArea(points: Vec3[], a: Axis, b: Axis): number {
  let s = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length] as Vec3;
    s += at(p, a) * at(q, b) - at(q, a) * at(p, b);
  });
  return Math.abs(s) / 2;
}

/** Longueur de la chaîne ; une chaîne fermée compte son dernier côté. */
export function chainLength(chain: Chain): number {
  const { points, closed } = chain;
  let len = 0;
  const last = closed ? points.length : points.length - 1;
  for (let i = 0; i < last; i++) {
    const p = points[i] as Vec3;
    const q = points[(i + 1) % points.length] as Vec3;
    len += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  }
  return len;
}

/** Plus grand contour fermé d'une coupe, mesuré par l'aire projetée sur les axes (a, b). */
export function largestLoop(chains: Chain[], a: Axis, b: Axis): Chain | undefined {
  let best: Chain | undefined;
  let bestArea = -1;
  for (const chain of chains) {
    if (!chain.closed) continue;
    const area = planarArea(chain.points, a, b);
    if (area > bestArea) {
      best = chain;
      bestArea = area;
    }
  }
  return best;
}

/** Enveloppe convexe d'une chaîne projetée sur les axes (a, b), avec son périmètre (comme un mètre ruban). */
export function chainHull(chain: Chain, a: Axis, b: Axis): { per: number; hull: Vec2[] } {
  return hullPerimeter(chain.points.map((p) => [at(p, a), at(p, b)] as Vec2));
}
