import type { CutPattern, CutPiece, Point } from '@atelier/contracts-ts';

/** Ce que l'application met en texte (ICU) pour une pièce : jamais une phrase ici. */
export interface CutPieceLabel {
  name: string;
  quantity: number;
  cutOnFold: boolean;
}

/** Une pièce prête à dessiner : chemins SVG en mm, y vers le bas, déjà placée à côté des autres. */
export interface CutPieceShape {
  id: string;
  cutPath: string;
  seamPath: string;
  notchesPath: string;
  grainPath: string;
  foldPath?: string;
  labelAt: [number, number];
  label: CutPieceLabel;
}

export interface CutPiecesLayout {
  pieces: CutPieceShape[];
  viewBox: string;
}

const GAP_MM = 40;
const ARROW_LENGTH_MM = 15;
const ARROW_HALF_ANGLE = Math.PI / 7;

type Place = (p: Point) => string;

const polyline = (points: readonly Point[], place: Place) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${place(p)}`).join(' ');

/** Pointe de flèche en `tip`, tournée vers l'autre bout `from` du segment. */
function arrowHead(tip: Point, from: Point, place: Place): string {
  const angle = Math.atan2(from[1] - tip[1], from[0] - tip[0]);
  const wing = (side: number): Point => [
    tip[0] + ARROW_LENGTH_MM * Math.cos(angle + side * ARROW_HALF_ANGLE),
    tip[1] + ARROW_LENGTH_MM * Math.sin(angle + side * ARROW_HALF_ANGLE),
  ];
  return polyline([wing(1), tip, wing(-1)], place);
}

function grainPath([a, b]: [Point, Point], place: Place): string {
  return [polyline([a, b], place), arrowHead(a, b, place), arrowHead(b, a, place)].join(' ');
}

function shapeOf(piece: CutPiece, offsetX: number): CutPieceShape {
  const { min, max } = piece.bounds;
  const dx = offsetX - min[0];
  const place: Place = (p) => `${(p[0] + dx).toFixed(1)} ${(max[1] - p[1]).toFixed(1)}`;
  const seam = piece.seamLine.map((edge) => polyline(edge.points, place));
  const notches = piece.notches.flatMap((n) => n.segments.map((s) => polyline(s, place)));
  const anchor = piece.labelAnchor;
  return {
    id: piece.panelId,
    cutPath: `${polyline(piece.cutLine, place)} Z`,
    seamPath: seam.join(' '),
    notchesPath: notches.join(' '),
    grainPath: grainPath(piece.grainline, place),
    ...(piece.foldLine ? { foldPath: polyline(piece.foldLine, place) } : {}),
    labelAt: [Number((anchor[0] + dx).toFixed(1)), Number((max[1] - anchor[1]).toFixed(1))],
    label: { name: piece.name, quantity: piece.quantity, cutOnFold: piece.cutOnFold },
  };
}

/** Place les pièces de coupe côte à côte et les retourne pour l'écran (y du contrat vers le haut). */
export function layoutCutPieces(cutPattern: CutPattern): CutPiecesLayout {
  let offsetX = 0;
  let height = 0;
  const pieces = cutPattern.pieces.map((piece) => {
    const { min, max } = piece.bounds;
    const shape = shapeOf(piece, offsetX);
    offsetX += max[0] - min[0] + GAP_MM;
    height = Math.max(height, max[1] - min[1]);
    return shape;
  });
  const width = Math.max(offsetX - GAP_MM, 1);
  return { pieces, viewBox: `-10 -10 ${(width + 20).toFixed(0)} ${(height + 20).toFixed(0)}` };
}
