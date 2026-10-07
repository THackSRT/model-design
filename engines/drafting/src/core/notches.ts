import { SheetError } from './errors.js';
import type { Piece } from './pieces.js';
import type { EdgeRun, PanelRun, PatternNotch } from './pattern-types.js';
import { subEdgeId } from './pattern-types.js';
import type { SewnSeam, WalkRef } from './seams.js';
import type { DraftedEdge, Segment } from './types.js';

/** Un point d'un bord entier : à `distanceMm` de son début. */
interface Spot {
  readonly run: EdgeRun;
  readonly distanceMm: number;
}

/** Un cran avant la pose : le bord entier, la distance depuis son début, et le nombre d'entailles. */
export interface Stop extends Spot {
  readonly count: number;
}

/** Deux distances à moins de ce rapprochement sont la même : un cran à la jonction de deux morceaux va au premier. */
const TIE_MM = 1e-6;

/** Distance depuis le début du bord au sommet qui porte le point nommé ; `undefined` si aucun sommet du bord ne le porte. */
function distanceToPoint(
  panel: PanelRun,
  edge: DraftedEdge,
  run: EdgeRun,
  name: string,
): number | undefined {
  const { vertices, segments } = panel.part.contour;
  const carries = (vertex: number): boolean => vertices[vertex]?.names.includes(name) === true;
  if (carries(edge.fromVertex)) return 0;
  let at = 0;
  for (const [rank, index] of edge.segments.entries()) {
    at += (run.pieces[rank] as Piece).lengthMm;
    if (carries((segments[index] as Segment).to)) return at;
  }
  return undefined;
}

/**
 * Crans que la fiche déclare sur une pièce, en distances le long de leur bord entier. À lire avant les coutures : elles
 * coupent les bords en morceaux, que `distanceToPoint` suit un à un comme les segments du contour.
 */
export function declaredStops(panel: PanelRun): Stop[] {
  return (panel.sheet.panel.notches ?? []).map((notch) => {
    const rank = panel.sheet.edges.findIndex((edge) => edge.id === notch.edge);
    const run = panel.edges[rank];
    const edge = panel.part.edges[rank];
    if (run === undefined || edge === undefined) {
      throw new SheetError(`part ${panel.sheet.id}`, `notch on unknown edge "${notch.edge}"`);
    }
    const distanceMm = distanceToPoint(panel, edge, run, notch.at);
    if (distanceMm === undefined) {
      throw new SheetError(
        `part ${panel.sheet.id}`,
        `notch point "${notch.at}" is not a vertex of edge "${notch.edge}"`,
      );
    }
    return { run, distanceMm, count: notch.count ?? 1 };
  });
}

/** Un parcours de couture mesuré : où commence chaque bord le long de lui, et sa longueur totale. */
interface WalkMap {
  readonly entries: readonly {
    readonly ref: WalkRef;
    readonly start: number;
    readonly length: number;
  }[];
  readonly total: number;
}

function mapOf(refs: readonly WalkRef[]): WalkMap {
  let total = 0;
  const entries = refs.map((ref) => {
    const length = ref.run.pieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
    const entry = { ref, start: total, length };
    total += length;
    return entry;
  });
  return { entries, total };
}

/** Abscisse le long du parcours d'un point d'un bord ; `undefined` si le bord n'est pas dans le parcours. */
function positionOf(map: WalkMap, run: EdgeRun, distanceMm: number): number | undefined {
  const entry = map.entries.find((candidate) => candidate.ref.run === run);
  if (entry === undefined) return undefined;
  return entry.start + (entry.ref.reversed ? entry.length - distanceMm : distanceMm);
}

/** Le bord du parcours et la distance depuis son début où tombe l'abscisse (au bord qui finit là, à la jonction). */
function locate(map: WalkMap, position: number): Spot {
  const found =
    map.entries.find((entry) => position <= entry.start + entry.length + TIE_MM) ??
    (map.entries[map.entries.length - 1] as WalkMap['entries'][number]);
  const along = Math.min(Math.max(position - found.start, 0), found.length);
  return { run: found.ref.run, distanceMm: found.ref.reversed ? found.length - along : along };
}

/**
 * Crans que ce cran appelle de l'autre côté de chaque couture qui porte son bord : à la même fraction de la longueur de
 * la couture, donc, sur une couture à embu, à une autre distance du début du bord (le cran de la tête de manche suit
 * l'embu). Même nombre d'entailles de chaque côté.
 */
export function carriedStops(stop: Stop, seams: readonly SewnSeam[]): Stop[] {
  const carried: Stop[] = [];
  for (const seam of seams) {
    for (const [from, to] of [
      [seam.a, seam.b],
      [seam.b, seam.a],
    ] as const) {
      const source = mapOf(from);
      const position = positionOf(source, stop.run, stop.distanceMm);
      if (position === undefined) continue;
      const target = mapOf(to);
      carried.push({
        ...locate(target, (position / source.total) * target.total),
        count: stop.count,
      });
    }
  }
  return carried;
}

/** Le cran posé sur le morceau du bord qui le porte, à sa distance depuis le début de ce morceau. */
export function placeStop(stop: Stop): PatternNotch {
  const { pieces } = stop.run;
  let start = 0;
  for (const [rank, piece] of pieces.entries()) {
    const end = start + piece.lengthMm;
    if (stop.distanceMm <= end + TIE_MM || rank === pieces.length - 1) {
      const local = Math.min(Math.max(stop.distanceMm - start, 0), piece.lengthMm);
      return { edgeId: subEdgeId(stop.run, rank), distanceMm: local, count: stop.count };
    }
    start = end;
  }
  throw new SheetError(`part ${stop.run.panel}`, `edge "${stop.run.sheet.id}" has no piece`);
}
