import type { Panel, Seam } from '@atelier/contracts-ts';
import type { GarmentMesh, GarmentPiece } from '../mesh/garment-mesh.js';
import {
  dirOf,
  nearestSegment,
  reversedLoop,
  walk,
  type Jump,
  type Loop,
  type Rules,
  type Step,
} from './contour-walk.js';
import {
  dartTable,
  endDirections,
  projectOnLine,
  projectRaw,
  type AnchorLine,
  type DartTable,
} from './line-projection.js';

export { projectOnLine } from './line-projection.js';
export type { AnchorLine } from './line-projection.js';

// Ligne d'ancrage d'une pièce (ADR 0013, « Mise en place par la ligne d'ancrage ») : chaîne des bords du contour qui
// passe par le point le plus proche de l'ancre, prolongée de chaque côté tant que l'angle au raccord reste sous 45°,
// qui enjambe une pince et ne suit jamais un bord `fold`. Un sommet est repéré par (s, d) : abscisse de son projeté
// sur la ligne depuis l'ancre, et distance signée à la ligne (positive vers le bas). Plan à plat, mm, y vers le haut.

const TINY = 1e-9;

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

/** Élément de la chaîne : segment [ax, ay, bx, by] ou corde d'une pince (avec la pince). */
interface Item {
  q: number[];
  dart?: Jump;
}

const flip = (q: number[]): number[] => [
  q[2] as number,
  q[3] as number,
  q[0] as number,
  q[1] as number,
];

/** Élément retourné : corde et côtés de la pince repris dans l'autre sens. */
function flipped(item: Item): Item {
  if (!item.dart) return { q: flip(item.q) };
  const { from, to, left, right } = item.dart;
  return { q: flip(item.q), dart: { from: to, to: from, left: right, right: left } };
}

/** Éléments des pas d'un parcours : la corde de la pince (s'il y en a une), puis le segment. */
function itemsOf(loop: Loop, steps: readonly Step[]): Item[] {
  const items: Item[] = [];
  for (const step of steps) {
    if (step.jump) {
      const { from, to } = step.jump;
      items.push({ q: [from[0], from[1], to[0], to[1]], dart: step.jump });
    }
    items.push(segmentItem(loop, step.seg));
  }
  return items;
}

function segmentItem(loop: Loop, k: number): Item {
  const [dx, dy] = dirOf(loop, k);
  const x = f(loop.x, k);
  const y = f(loop.y, k);
  return { q: [x, y, x + dx, y + dy] };
}

/** Chaîne autour du segment d'ancrage `anchor` ; `at` est l'indice de ce segment dans la chaîne. */
function chainItems(loop: Loop, anchor: number, rules: Rules): { items: Item[]; at: number } {
  const n = loop.edge.length;
  const back = reversedLoop(loop);
  const before = itemsOf(back, walk(back, (n - 2 - anchor + n) % n, rules))
    .map(flipped)
    .reverse();
  const after = itemsOf(loop, walk(loop, anchor, rules));
  return { items: [...before, segmentItem(loop, anchor), ...after], at: before.length };
}

/**
 * Segment d'ancrage plus raide que 2 pour 1 (centre du devant sur pliure, milieu du dos) : l'ancre est sur l'axe du
 * corps, pas sur une ligne de taille ; la pièce garde alors le repérage du patron (x depuis l'ancre, y moins l'ancre).
 */
function isSteep(q: readonly number[]): boolean {
  const dx = Math.abs((q[2] as number) - (q[0] as number));
  const dy = Math.abs((q[3] as number) - (q[1] as number));
  return dy > 2 * dx;
}

/** Orientation : vers les x croissants à l'ancre. */
function oriented(found: { items: Item[]; at: number }): Item[] {
  const s = (found.items[found.at] as Item).q;
  const dx = (s[2] as number) - (s[0] as number);
  const dy = (s[3] as number) - (s[1] as number);
  if (dx > TINY || (Math.abs(dx) <= TINY && dy <= 0)) return found.items;
  return found.items.map(flipped).reverse();
}

function packLine(items: readonly Item[]): AnchorLine {
  const n = items.length;
  const segments = new Float64Array(4 * n);
  const gap = new Uint8Array(n);
  const starts = new Float64Array(n);
  const lengths = new Float64Array(n);
  let raw = 0;
  let closed = 0;
  items.forEach((item, k) => {
    const q = item.q;
    const dx = (q[2] as number) - (q[0] as number);
    const dy = (q[3] as number) - (q[1] as number);
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.set(q, 4 * k);
    gap[k] = item.dart ? 1 : 0;
    starts[k] = raw;
    lengths[k] = len;
    raw += len;
    if (!item.dart) closed += len;
  });
  const ends = endDirections(items.map((it) => [...it.q, it.dart ? 1 : 0]));
  return {
    segments,
    gap,
    starts,
    lengths,
    length: closed,
    anchorSigma: 0,
    range: [0, closed],
    ends,
    darts: [],
  };
}

/** Contour d'un exemplaire (les sommets de bord viennent en premier, dans l'ordre du contour). */
function loopOf(mesh: GarmentMesh, piece: GarmentPiece): Loop {
  let n = 0;
  while (n < piece.vertexCount && (mesh.vertexEdge[piece.vertexStart + n] as number) >= 0) n++;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const edge = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = mesh.cloth.flatMm[2 * (piece.vertexStart + i)] as number;
    y[i] = mesh.cloth.flatMm[2 * (piece.vertexStart + i) + 1] as number;
    edge[i] = mesh.vertexEdge[piece.vertexStart + i] as number;
  }
  return { x, y, edge };
}

function rulesOf(panel: Panel, seams: readonly Seam[]): Rules {
  const index = new Map(panel.edges.map((e, i) => [e.id, i]));
  const pairs = new Set<string>();
  for (const s of seams) {
    const [a, b] = [index.get(s.a.edgeId), index.get(s.b.edgeId)];
    const own = s.a.panelId === panel.id && s.b.panelId === panel.id;
    if (own && a !== undefined && b !== undefined) {
      pairs.add(`${a}|${b}`);
      pairs.add(`${b}|${a}`);
    }
  }
  return {
    isFold: (e) => panel.edges[e]?.role === 'fold',
    isDart: (a, b) => pairs.has(`${a}|${b}`),
  };
}

/**
 * Ligne d'ancrage de l'exemplaire `piece` de `panel`, dans le repère à plat du maillage. `seams` : coutures du
 * vêtement (celles de la pièce avec elle-même sont des pinces). Rend `undefined` si le contour est vide ou si le segment d'ancrage est raide (repérage du patron).
 */
export function anchorLine(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  panel: Panel,
  seams: readonly Seam[],
): AnchorLine | undefined {
  const loop = loopOf(mesh, piece);
  if (loop.edge.length < 3 || panel.placement === undefined) return undefined;
  const point = panel.placement.anchor.point;
  const ax = (piece.mirrored ? -point[0] : point[0]) + piece.shiftXMm;
  const anchor = nearestSegment(loop, ax, point[1]);
  const found = chainItems(loop, anchor, rulesOf(panel, seams));
  if (isSteep((found.items[found.at] as Item).q)) return undefined;
  const items = oriented(found);
  const line = packLine(items);
  const tables: DartTable[] = [];
  for (const item of items) {
    if (item.dart) tables.push(dartTable(line, item.dart.left, item.dart.right));
  }
  line.darts = tables;
  return anchored(line, [ax, point[1]]);
}

/** Fixe l'ancre (abscisse brute) et l'étendue de s sur la ligne. */
function anchored(line: AnchorLine, anchor: readonly [number, number]): AnchorLine {
  const out = new Float64Array(2);
  projectRaw(line, anchor[0], anchor[1], out);
  line.anchorSigma = f(out, 0);
  const n = line.lengths.length;
  const last = 4 * (n - 1);
  projectOnLine(line, f(line.segments, 0), f(line.segments, 1), out);
  const lo = f(out, 0);
  projectOnLine(line, f(line.segments, last + 2), f(line.segments, last + 3), out);
  line.range = [lo, f(out, 0)];
  return line;
}
