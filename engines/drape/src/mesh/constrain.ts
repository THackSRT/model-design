import { InvalidInputError } from '../core/validate.js';
import type { Triangulation } from './triangulation.js';

// Récupération d'une arête contrainte (Sloan 1993) : on retourne les arêtes qui coupent le segment [a, b] jusqu'à
// ce que a-b soit une arête de la triangulation.

const next = (k: number): number => (k === 2 ? 0 : k + 1);
const prev = (k: number): number => (k === 0 ? 2 : k - 1);

function fail(what: string): never {
  throw new InvalidInputError('mesh', `outline: ${what}`);
}

/** Premier triangle autour de a dont l'angle contient la direction a→b. */
function firstCrossing(tr: Triangulation, a: number, b: number): number {
  const start = tr.vt[a] as number;
  let s = start;
  for (let guard = 0; s >= 0 && guard <= tr.triangleCount; guard++) {
    const i = tr.indexOf(s, a);
    const p = tr.v[3 * s + next(i)] as number;
    const q = tr.v[3 * s + prev(i)] as number;
    const [o1, o2] = [tr.orient(a, p, b), tr.orient(a, q, b)];
    if (o1 === 0 && sameDirection(tr, a, p, b)) fail('a vertex lies on a constrained edge');
    if (o1 > 0 && o2 < 0) return s;
    s = tr.nb[3 * s + next(i)] as number;
    if (s === start) break;
  }
  return fail('no triangle contains the constrained direction');
}

function sameDirection(tr: Triangulation, a: number, p: number, b: number): boolean {
  const q = tr.pts;
  const d =
    ((q[2 * p] as number) - (q[2 * a] as number)) * ((q[2 * b] as number) - (q[2 * a] as number)) +
    ((q[2 * p + 1] as number) - (q[2 * a + 1] as number)) *
      ((q[2 * b + 1] as number) - (q[2 * a + 1] as number));
  return d > 0;
}

/** Arêtes (droite, gauche) coupées par a→b, de a vers b. */
function collectCrossing(tr: Triangulation, a: number, b: number): [number, number][] {
  let t = firstCrossing(tr, a, b);
  const i = tr.indexOf(t, a);
  let right = tr.v[3 * t + next(i)] as number;
  let left = tr.v[3 * t + prev(i)] as number;
  const edges: [number, number][] = [[right, left]];
  if (tr.isConstrained(right, left)) fail('constrained edges cross');
  for (let guard = 0; guard <= tr.triangleCount; guard++) {
    const u = acrossEdge(tr, t, right, left);
    const w = tr.apex(u, t);
    if (w === b) return edges;
    const o = tr.orient(a, b, w);
    if (o === 0) fail('a vertex lies on a constrained edge');
    if (o > 0) left = w;
    else right = w;
    t = u;
    if (tr.isConstrained(right, left)) fail('constrained edges cross');
    edges.push([right, left]);
  }
  return fail('walk did not end');
}

/** Triangle de l'autre côté de l'arête (x, y) du triangle t. */
function acrossEdge(tr: Triangulation, t: number, x: number, y: number): number {
  for (let k = 0; k < 3; k++) {
    const m = tr.v[3 * t + k] as number;
    if (m !== x && m !== y) return tr.nb[3 * t + k] as number;
  }
  return fail('inconsistent triangulation');
}

function crossesSegment(
  tr: Triangulation,
  [a, b]: readonly [number, number],
  [c, d]: readonly [number, number],
): boolean {
  return tr.orient(a, b, c) * tr.orient(a, b, d) < 0 && tr.orient(c, d, a) * tr.orient(c, d, b) < 0;
}

/** Rend a-b arête de la triangulation (retournements) puis la marque contrainte. */
export function insertConstraint(tr: Triangulation, a: number, b: number): void {
  if (a === b) fail('degenerate edge');
  if (tr.edgeTri(a, b) < 0) {
    const queue = collectCrossing(tr, a, b);
    const limit = 50 * queue.length + 1000;
    for (let head = 0, guard = 0; head < queue.length; head++, guard++) {
      if (guard > limit) fail('edge recovery did not end');
      const [x, y] = queue[head] as [number, number];
      const code = tr.edgeTri(x, y);
      if (code < 0) fail('crossing edge not found');
      const diagonal = tr.flipAt(Math.floor(code / 3), code % 3);
      if (diagonal === null) queue.push([x, y]);
      else if (crossesSegment(tr, [a, b], diagonal)) queue.push([...diagonal]);
    }
  }
  if (tr.edgeTri(a, b) < 0) fail('edge recovery failed');
  tr.mark(a, b);
}
