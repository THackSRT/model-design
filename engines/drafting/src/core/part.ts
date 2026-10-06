import { extractContour } from './contour.js';
import { assertCoverage, resolveEdges } from './edges.js';
import { ContourError } from './errors.js';
import { assertFinitePoints, nameVertices, publicPoints } from './points.js';
import { roundMm, roundPoint } from './round.js';
import type { PartSheet } from './sheet.js';
import type {
  DraftedContour,
  DraftedEdge,
  DraftedPart,
  PointMm,
  Segment,
  TracedPart,
} from './types.js';

function roundSegment(segment: Segment): Segment {
  const { cp1, cp2, ...rest } = segment;
  const rounded = { ...rest, lengthMm: roundMm(segment.lengthMm) };
  return cp1 && cp2 ? { ...rounded, cp1: roundPoint(cp1), cp2: roundPoint(cp2) } : rounded;
}

function roundContour(
  vertices: readonly PointMm[],
  segments: readonly Segment[],
  names: readonly (readonly string[])[],
): DraftedContour {
  return {
    vertices: vertices.map((vertex, index) => ({
      ...roundPoint(vertex),
      names: names[index] ?? [],
    })),
    segments: segments.map(roundSegment),
  };
}

const roundEdge = (edge: DraftedEdge): DraftedEdge => ({
  ...edge,
  lengthMm: roundMm(edge.lengthMm),
});

/**
 * Découpe une pièce tracée en bords nommés selon sa fiche de couture, et la contrôle : contour de couture fermé,
 * tous les bords de la fiche retrouvés, contour couvert exactement une fois. Les sorties sont arrondies à 0,001 mm.
 * Erreur typée (`DraftingError`) au premier contrôle qui échoue.
 */
export function draftPart(sheet: PartSheet, traced: TracedPart | undefined): DraftedPart {
  if (traced === undefined || traced.hidden) {
    throw new ContourError(sheet.part, 'the part was not drafted (absent or hidden)');
  }
  const contour = extractContour(sheet.part, traced.seam);
  const points = publicPoints(traced.points);
  assertFinitePoints(sheet.part, points);
  const edges = resolveEdges(sheet.part, sheet.edges, contour, points);
  assertCoverage(sheet.part, contour, edges);
  const names = nameVertices(contour.vertices, points);
  return {
    part: sheet.part,
    id: sheet.id,
    contour: roundContour(contour.vertices, contour.segments, names),
    edges: edges.map(roundEdge),
    points: Object.fromEntries(
      Object.entries(points).map(([name, point]) => [name, roundPoint(point)]),
    ),
  };
}
