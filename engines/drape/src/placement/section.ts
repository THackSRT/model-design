import type { BodyMesh } from '../core/types.js';
import type { Vec3 } from './types.js';

// Coupe du corps par un plan : points d'intersection des arêtes, regroupés en composantes connexes (tronc, jambes,
// bras tant qu'ils ne se touchent pas). Le corps est fermé et soudé (src/body), donc deux triangles voisins
// partagent leurs sommets.

/** Points de coupe (3 valeurs chacun) et composante connexe de chacun. */
export interface Crossings {
  xyz: Float64Array;
  component: Uint32Array;
  count: number;
}

export interface BodySectioner {
  /** Coupe par le plan passant par `origin` de normale `normal` (unitaire). */
  cut(origin: Vec3, normal: Vec3): Crossings;
}

function find(parent: number[], i: number): number {
  let r = i;
  while ((parent[r] as number) !== r) r = parent[r] as number;
  let j = i;
  while ((parent[j] as number) !== r) {
    const next = parent[j] as number;
    parent[j] = r;
    j = next;
  }
  return r;
}

interface Builder {
  xyz: number[];
  parent: number[];
  byEdge: Map<number, number>;
}

function crossing(
  body: BodyMesh,
  side: Float64Array,
  b: Builder,
  edge: readonly [number, number],
): number {
  const [i, j] = edge[0] < edge[1] ? edge : ([edge[1], edge[0]] as const);
  const key = i * (body.positionsMm.length / 3) + j;
  const known = b.byEdge.get(key);
  if (known !== undefined) return known;
  const di = side[i] as number;
  const w = di / (di - (side[j] as number));
  for (let k = 0; k < 3; k++) {
    const p = body.positionsMm[3 * i + k] as number;
    const q = body.positionsMm[3 * j + k] as number;
    b.xyz.push(p + (q - p) * w);
  }
  b.parent.push(b.parent.length);
  b.byEdge.set(key, b.parent.length - 1);
  return b.parent.length - 1;
}

/** Relie les deux points de coupe d'un triangle ; rien si le plan ne le traverse pas. */
function cutTriangle(body: BodyMesh, side: Float64Array, b: Builder, t: number): void {
  const tri = body.triangles;
  const v = [tri[3 * t] as number, tri[3 * t + 1] as number, tri[3 * t + 2] as number];
  const above = v.map((i) => (side[i] as number) > 0);
  const hits: number[] = [];
  for (let e = 0; e < 3; e++) {
    const n = (e + 1) % 3;
    if (above[e] !== above[n]) hits.push(crossing(body, side, b, [v[e] as number, v[n] as number]));
  }
  if (hits.length < 2) return;
  const ra = find(b.parent, hits[0] as number);
  const rb = find(b.parent, hits[1] as number);
  b.parent[Math.max(ra, rb)] = Math.min(ra, rb);
}

/** Composantes numérotées de 0 à n-1 dans l'ordre de leur premier point. */
function components(parent: number[]): Uint32Array {
  const roots = parent.slice();
  const ids = new Map<number, number>();
  const out = new Uint32Array(parent.length);
  for (let i = 0; i < parent.length; i++) {
    const r = find(roots, i);
    let id = ids.get(r);
    if (id === undefined) {
      id = ids.size;
      ids.set(r, id);
    }
    out[i] = id;
  }
  return out;
}

export function createSectioner(body: BodyMesh): BodySectioner {
  const nv = body.positionsMm.length / 3;
  return {
    cut(origin, normal) {
      const side = new Float64Array(nv);
      for (let v = 0; v < nv; v++) {
        side[v] =
          ((body.positionsMm[3 * v] as number) - origin[0]) * normal[0] +
          ((body.positionsMm[3 * v + 1] as number) - origin[1]) * normal[1] +
          ((body.positionsMm[3 * v + 2] as number) - origin[2]) * normal[2];
      }
      const b: Builder = { xyz: [], parent: [], byEdge: new Map() };
      for (let t = 0; t < body.triangles.length / 3; t++) cutTriangle(body, side, b, t);
      return {
        xyz: Float64Array.from(b.xyz),
        component: components(b.parent),
        count: b.parent.length,
      };
    },
  };
}
