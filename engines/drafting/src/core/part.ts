import { extractContour } from './contour.js';
import { assertCoverage, resolveEdges } from './edges.js';
import { ContourError, SheetError } from './errors.js';
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

/** Le point rendu dans le repère de la pièce (voir `FrameSheet`), arrondi à 0,001 mm. */
type Place = (point: PointMm) => PointMm;

function roundSegment(segment: Segment, place: Place): Segment {
  const { cp1, cp2, ...rest } = segment;
  const rounded = { ...rest, lengthMm: roundMm(segment.lengthMm) };
  return cp1 && cp2 ? { ...rounded, cp1: place(cp1), cp2: place(cp2) } : rounded;
}

function roundContour(
  vertices: readonly PointMm[],
  segments: readonly Segment[],
  names: readonly (readonly string[])[],
  place: Place,
): DraftedContour {
  return {
    vertices: vertices.map((vertex, index) => ({
      ...place(vertex),
      names: names[index] ?? [],
    })),
    segments: segments.map((segment) => roundSegment(segment, place)),
  };
}

const roundEdge = (edge: DraftedEdge): DraftedEdge => ({
  ...edge,
  lengthMm: roundMm(edge.lengthMm),
});

/**
 * Fonction qui met un point dans le repère de la pièce : l'axe et le haut que la fiche nomme deviennent x = 0 et y = 0.
 * Sans repère dans la fiche, le point garde les coordonnées de FreeSewing. Le repère est celui des sorties seulement : les
 * bords se retrouvent sur le tracé de FreeSewing, que le décalage ne doit pas toucher (`sitsRoughlyOn` arrondit).
 */
function placeIn(sheet: PartSheet, points: Readonly<Record<string, PointMm>>): Place {
  const { frame } = sheet;
  if (frame === undefined) return roundPoint;
  const axis = points[frame.axis];
  const top = points[frame.top];
  if (axis === undefined || top === undefined) {
    const missing = axis === undefined ? frame.axis : frame.top;
    throw new SheetError(`part ${sheet.id}`, `frame point "${missing}" does not exist in the part`);
  }
  return (point) => roundPoint({ xMm: point.xMm - axis.xMm, yMm: point.yMm - top.yMm });
}

/**
 * Découpe une pièce tracée en bords nommés selon sa fiche de couture, et la contrôle : contour de couture fermé,
 * tous les bords de la fiche retrouvés, contour couvert exactement une fois. Les sorties sont dans le repère de la pièce
 * et arrondies à 0,001 mm. Erreur typée (`DraftingError`) au premier contrôle qui échoue.
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
  const place = placeIn(sheet, points);
  return {
    part: sheet.part,
    id: sheet.id,
    contour: roundContour(contour.vertices, contour.segments, names, place),
    edges: edges.map(roundEdge),
    points: Object.fromEntries(Object.entries(points).map(([name, point]) => [name, place(point)])),
  };
}
