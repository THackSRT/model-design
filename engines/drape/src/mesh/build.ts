import { InvalidInputError } from '../core/validate.js';
import { insertConstraint } from './constrain.js';
import { MAX_VERTICES_PER_GARMENT } from './limits.js';
import { MAX_EDGE_RATIO } from './outline.js';
import { splitLongEdges } from './refine.js';
import { Triangulation } from './triangulation.js';

export interface OutlineTriangulation {
  /** Les points donnés puis les sommets ajoutés par le raffinement, x, y. */
  positionsMm: Float64Array;
  triangles: Uint32Array;
}

/**
 * Triangulation de Delaunay contrainte du contour. `points` : les `boundaryCount` premiers sont le contour dans
 * l'ordre (arêtes i → i+1, la dernière revenant à 0), les suivants sont intérieurs. Renvoie les triangles
 * antihoraires situés dans le contour (3 indices par triangle).
 */
export function triangulateOutline(
  points: Float64Array,
  boundaryCount: number,
  edgeMm: number,
  maxVertices = MAX_VERTICES_PER_GARMENT,
): OutlineTriangulation {
  const tr = new Triangulation(points, edgeMm);
  for (let i = 0; i < tr.realCount; i++) tr.insert(i);
  for (let i = 0; i < boundaryCount; i++) insertConstraint(tr, i, (i + 1) % boundaryCount);
  tr.legalizeAll();
  splitLongEdges(tr, classify, MAX_EDGE_RATIO * edgeMm, maxVertices);
  const inside = classify(tr);
  // Les trois sommets du triangle englobant sortent de la numérotation ; les ajouts suivent les points donnés.
  const renumber = (v: number): number => (v >= tr.realCount ? v - 3 : v);
  const triangles: number[] = [];
  for (let t = 0; t < tr.triangleCount; t++) {
    if (inside[t] === 1) triangles.push(...tr.tri(t).map(renumber));
  }
  const added = tr.vertexCount - tr.realCount - 3;
  const positionsMm = new Float64Array(2 * (tr.realCount + added));
  positionsMm.set(tr.pts.subarray(0, 2 * tr.realCount));
  positionsMm.set(tr.pts.subarray(2 * (tr.realCount + 3), 2 * tr.vertexCount), 2 * tr.realCount);
  return { positionsMm, triangles: Uint32Array.from(triangles) };
}

/**
 * 1 pour les triangles dans le contour, 0 dehors : on part des triangles qui touchent le triangle englobant (dehors)
 * et la parité change à chaque arête contrainte franchie (règle pair-impair).
 */
function classify(tr: Triangulation): Int8Array {
  const state = new Int8Array(tr.triangleCount).fill(-1);
  const queue: number[] = [];
  for (let t = 0; t < tr.triangleCount; t++) {
    if (tr.tri(t).some((v) => tr.isSuper(v))) {
      state[t] = 0;
      queue.push(t);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const t = queue[head] as number;
    for (let k = 0; k < 3; k++) visit(tr, { state, queue }, t, k);
  }
  if (state.some((s) => s < 0)) throw new InvalidInputError('mesh', 'outline: unreachable region');
  return state;
}

function visit(
  tr: Triangulation,
  { state, queue }: { state: Int8Array; queue: number[] },
  t: number,
  k: number,
): void {
  const u = tr.nb[3 * t + k] as number;
  if (u < 0) return;
  const a = tr.v[3 * t + ((k + 1) % 3)] as number;
  const b = tr.v[3 * t + ((k + 2) % 3)] as number;
  const want = (tr.isConstrained(a, b) ? 1 - (state[t] as number) : state[t]) as number;
  if (state[u] === -1) {
    state[u] = want;
    queue.push(u);
  } else if (state[u] !== want) {
    throw new InvalidInputError('mesh', 'outline crosses itself');
  }
}
