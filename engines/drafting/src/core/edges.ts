import { CoverageError, EdgeNotFoundError } from './errors.js';
import { vertexCandidates } from './points.js';
import type { EdgeSheet } from './sheet.js';
import type { Contour, DraftedEdge, PointMm, Segment } from './types.js';

interface Context {
  readonly contour: Contour;
  readonly points: Readonly<Record<string, PointMm>>;
}

interface Route {
  readonly from: number;
  readonly to: number;
  readonly segments: readonly number[];
}

/** Segments parcourus du sommet `from` au sommet `to`, dans le sens du contour (avec rebouclage), ou `undefined`. */
function walk(contour: Contour, from: number, to: number): number[] | undefined {
  const count = contour.segments.length;
  const first = contour.segments.findIndex((segment) => segment.from === from);
  if (first < 0 || from === to) return undefined;
  const route: number[] = [];
  for (let step = 0; step < count; step++) {
    const index = (first + step) % count;
    route.push(index);
    if ((contour.segments[index] as Segment).to === to) return route;
  }
  return undefined;
}

/** Le chemin le plus court, en nombre de segments, d'un des sommets `froms` à un des sommets `tos`. */
function shortestRoute(
  contour: Contour,
  froms: readonly number[],
  tos: readonly number[],
): Route | undefined {
  let best: Route | undefined;
  for (const from of froms) {
    for (const to of tos) {
      const segments = walk(contour, from, to);
      if (segments && (best === undefined || segments.length < best.segments.length)) {
        best = { from, to, segments };
      }
    }
  }
  return best;
}

/** Sommets du contour où se trouve le point nommé ; erreur si le point n'existe pas ou n'est pas un sommet. */
function verticesOf(part: string, edge: EdgeSheet, name: string, ctx: Context): number[] {
  const point = ctx.points[name];
  if (point === undefined) {
    throw new EdgeNotFoundError(part, edge.id, `point "${name}" does not exist in the part`);
  }
  const found = vertexCandidates(ctx.contour.vertices, point);
  if (found.length === 0) {
    throw new EdgeNotFoundError(
      part,
      edge.id,
      `point "${name}" is not a vertex of the seam contour`,
    );
  }
  return found;
}

/** Un point `via` qui est un sommet du contour doit se trouver sur le bord ; sinon la fiche et le tracé divergent. */
function checkVia(part: string, edge: EdgeSheet, route: Route, ctx: Context): void {
  const inside = new Set<number>();
  for (const index of route.segments) {
    const segment = ctx.contour.segments[index] as Segment;
    inside.add(segment.from);
    inside.add(segment.to);
  }
  for (const name of edge.via ?? []) {
    const point = ctx.points[name];
    const found = point === undefined ? [] : vertexCandidates(ctx.contour.vertices, point);
    if (found.length > 0 && !found.some((vertex) => inside.has(vertex))) {
      throw new EdgeNotFoundError(part, edge.id, `point "${name}" is a vertex outside this edge`);
    }
  }
}

function resolveEdge(part: string, edge: EdgeSheet, ctx: Context): DraftedEdge {
  const froms = verticesOf(part, edge, edge.from, ctx);
  const tos = verticesOf(part, edge, edge.to, ctx);
  const route = shortestRoute(ctx.contour, froms, tos);
  if (route === undefined) {
    const reason = `no path along the contour from "${edge.from}" to "${edge.to}"`;
    throw new EdgeNotFoundError(part, edge.id, reason);
  }
  checkVia(part, edge, route, ctx);
  const lengthMm = route.segments.reduce(
    (total, index) => total + (ctx.contour.segments[index] as Segment).lengthMm,
    0,
  );
  return {
    id: edge.id,
    semanticRole: edge.semanticRole,
    fromPoint: edge.from,
    toPoint: edge.to,
    fromVertex: route.from,
    toVertex: route.to,
    segments: route.segments,
    lengthMm,
  };
}

/**
 * Retrouve chaque bord de la fiche sur le contour : le plus court chemin, dans le sens du contour, entre les sommets
 * des deux points nommés. Longueurs brutes. Erreur typée au premier bord introuvable.
 */
export function resolveEdges(
  part: string,
  edges: readonly EdgeSheet[],
  contour: Contour,
  points: Readonly<Record<string, PointMm>>,
): DraftedEdge[] {
  const ctx: Context = { contour, points };
  return edges.map((edge) => resolveEdge(part, edge, ctx));
}

/** Les bords couvrent le contour exactement une fois : aucun segment sans bord, aucun dans deux bords. */
export function assertCoverage(
  part: string,
  contour: Contour,
  edges: readonly DraftedEdge[],
): void {
  const counts = contour.segments.map(() => 0);
  for (const edge of edges) {
    for (const index of edge.segments) counts[index] = (counts[index] as number) + 1;
  }
  const uncovered = counts.flatMap((count, index) => (count === 0 ? [index] : []));
  const overlapping = counts.flatMap((count, index) => (count > 1 ? [index] : []));
  if (uncovered.length > 0 || overlapping.length > 0) {
    throw new CoverageError(part, uncovered, overlapping);
  }
}
