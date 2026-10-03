/*
 * Coupes horizontales du corps : intersection du maillage avec un plan y = h, découpée en
 * composantes connexes (tronc, jambes, bras sont des composantes distinctes tant qu'ils ne se touchent
 * pas). Les sommets dédoublés aux coutures UV sont soudés par leur position. Unités : cm.
 */
import { hullPerimeter } from '../core/geometry.js';
import { at } from '../core/mesh.js';
import type { Vec2 } from '../core/types.js';

/** Une composante de la coupe : points (x, z), enveloppe convexe, aire de l'enveloppe, centre. */
export interface SectionPart {
  points: Vec2[];
  hull: Vec2[];
  area: number;
  /** Centre de gravité de l'enveloppe. */
  center: Vec2;
}

/** Filtre de points de coupe : vrai pour un point (x, y, z) à écarter (bras). */
export type DropPoint = (x: number, y: number, z: number) => boolean;

export interface BodySectioner {
  /** Composantes de la coupe à la hauteur donnée (cm), de la plus grande à la plus petite. */
  at(heightCm: number): SectionPart[];
  /** Comme `at`, en écartant les points de coupe que `drop` désigne ; `dropped` : combien ont été écartés. */
  cut(heightCm: number, drop?: DropPoint): { parts: SectionPart[]; dropped: number };
}

const WELD_CM = 1e-3;
const BIN_CM = 0.5;

/** Identifiant de sommet soudé : deux sommets à la même position (au micron près) en partagent un. */
function weld(pos: Float32Array): Uint32Array {
  const ids = new Uint32Array(pos.length / 3);
  const seen = new Map<string, number>();
  for (let v = 0; v < ids.length; v++) {
    const key = [0, 1, 2].map((q) => Math.round(at(pos, 3 * v + q) / WELD_CM)).join(',');
    let id = seen.get(key);
    if (id === undefined) {
      id = seen.size;
      seen.set(key, id);
    }
    ids[v] = id;
  }
  return ids;
}

const areaOf = (hull: Vec2[]): number => {
  let s = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i] as Vec2;
    const b = hull[(i + 1) % hull.length] as Vec2;
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
};

/** Centre de gravité de la surface de l'enveloppe. */
const centerOf = (hull: Vec2[]): Vec2 => {
  let a2 = 0;
  const c: Vec2 = [0, 0];
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i] as Vec2;
    const q = hull[(i + 1) % hull.length] as Vec2;
    const w = p[0] * q[1] - q[0] * p[1];
    a2 += w;
    c[0] += (p[0] + q[0]) * w;
    c[1] += (p[1] + q[1]) * w;
  }
  return [c[0] / (3 * a2), c[1] / (3 * a2)];
};

/** Racine d'une classe d'équivalence (compression de chemin). */
function find(parent: number[], i: number): number {
  let r = i;
  while (at(parent, r) !== r) r = at(parent, r);
  let j = i;
  while (at(parent, j) !== r) {
    const next = at(parent, j);
    parent[j] = r;
    j = next;
  }
  return r;
}

/** Points de coupe (un par arête coupée) et classes d'équivalence entre eux. */
interface Crossings {
  points: Vec2[];
  parent: number[];
}

/** Regroupe les points de coupe reliés par un triangle ; une classe = une composante. */
function toParts(c: Crossings, keep: (p: Vec2) => boolean = () => true): SectionPart[] {
  const groups = new Map<number, Vec2[]>();
  c.points.forEach((p, i) => {
    if (!keep(p)) return;
    const r = find(c.parent, i);
    const list = groups.get(r);
    if (list) list.push(p);
    else groups.set(r, [p]);
  });
  const out: SectionPart[] = [];
  for (const points of groups.values()) {
    const { hull } = hullPerimeter(points);
    if (hull.length < 3) continue;
    out.push({ points, hull, area: areaOf(hull), center: centerOf(hull) });
  }
  return out.sort((a, b) => b.area - a.area);
}

/** Triangles classés par tranche de hauteur : une coupe ne regarde que les triangles de sa tranche. */
function binTriangles(pos: Float32Array, index: ArrayLike<number>): number[][] {
  const bins: number[][] = [];
  const bin = (v: number): number => Math.floor(at(pos, 3 * v + 1) / BIN_CM);
  for (let t = 0; t < index.length; t += 3) {
    const bs = [0, 1, 2].map((q) => bin(at(index, t + q)));
    for (let b = Math.min(...bs); b <= Math.max(...bs); b++) (bins[b] ??= []).push(t);
  }
  return bins;
}

/** Maillage soudé et classé par tranches, prêt à être coupé. */
interface Mesh {
  flat: Float32Array;
  ids: Uint32Array;
  bins: number[][];
  index: ArrayLike<number>;
}

/** Points de coupe à la hauteur h et classes d'équivalence entre eux (un triangle relie ses deux points). */
function crossings(m: Mesh, h: number): Crossings {
  const c: Crossings = { points: [], parent: [] };
  const byEdge = new Map<number, number>();
  const y = (v: number): number => at(m.flat, 3 * v + 1);
  const crossing = (i: number, j: number): number => {
    const [a, b] = at(m.ids, i) < at(m.ids, j) ? [i, j] : [j, i];
    const key = at(m.ids, a) * m.ids.length + at(m.ids, b);
    const known = byEdge.get(key);
    if (known !== undefined) return known;
    const f = (h - y(a)) / (y(b) - y(a));
    const lerp = (q: number): number =>
      at(m.flat, 3 * a + q) + (at(m.flat, 3 * b + q) - at(m.flat, 3 * a + q)) * f;
    c.points.push([lerp(0), lerp(2)]);
    c.parent.push(c.points.length - 1);
    byEdge.set(key, c.points.length - 1);
    return c.points.length - 1;
  };
  for (const t of m.bins[Math.floor(h / BIN_CM)] ?? []) {
    const tri = [0, 1, 2].map((q) => at(m.index, t + q));
    const above = tri.map((v) => y(v) > h);
    const hits: number[] = [];
    for (let e = 0; e < 3; e++) {
      if (above[e] !== above[(e + 1) % 3]) hits.push(crossing(at(tri, e), at(tri, (e + 1) % 3)));
    }
    if (hits.length < 2) continue;
    c.parent[find(c.parent, at(hits, 1))] = find(c.parent, at(hits, 0));
  }
  return c;
}

export function createSectioner(pos: ArrayLike<number>, index: ArrayLike<number>): BodySectioner {
  const flat = Float32Array.from(pos);
  const mesh: Mesh = { flat, ids: weld(flat), bins: binTriangles(flat, index), index };
  const sectioner: BodySectioner = {
    at: (h) => sectioner.cut(h).parts,
    cut(h, drop) {
      const c = crossings(mesh, h);
      if (!drop) return { parts: toParts(c), dropped: 0 };
      const dropped = c.points.filter((p) => drop(p[0], h, p[1])).length;
      return { parts: toParts(c, (p) => !drop(p[0], h, p[1])), dropped };
    },
  };
  return sectioner;
}
