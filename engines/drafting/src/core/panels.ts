import { ContourError, SheetError } from './errors.js';
import { isNear } from './contour.js';
import { flipPiece, mergeCollinear, pieceOfSegment, signedArea } from './pieces.js';
import type { Piece } from './pieces.js';
import type {
  EdgeRun,
  PanelRun,
  PatternEdge,
  PatternNotch,
  PatternPanel,
  PatternPlacement,
} from './pattern-types.js';
import { subEdgeId } from './pattern-types.js';
import { structuralRoleOf } from './sheet.js';
import type { GrainSheet, PartSheet } from './sheet.js';
import type { DraftedEdge, DraftedPart, PointMm } from './types.js';

/** Écart permis entre le bord de pli et l'axe de la pièce (x = 0) : la même tolérance que pour nommer un sommet. */
const FOLD_TOLERANCE_MM = 0.01;

/** Deux extrémités de bords consécutifs plus éloignées que cela ne se raccordent pas. */
const CHAIN_TOLERANCE_MM = 1e-6;

function piecesOf(part: DraftedPart, edge: DraftedEdge): Piece[] {
  const { vertices, segments } = part.contour;
  return edge.segments.map((index) => {
    const segment = segments[index];
    const piece = segment === undefined ? undefined : pieceOfSegment(segment, vertices);
    if (piece === undefined)
      throw new ContourError(part.part, 'a curve segment has no control points');
    return flipPiece(piece);
  });
}

/**
 * Commence l'assemblage d'une pièce : ses bords en pièces dans le repère de GarmentSpec (y vers le haut, le repère de la
 * pièce tracée retourné en y). La pièce tracée doit être celle de la fiche, bord pour bord.
 */
export function startPanel(sheet: PartSheet, part: DraftedPart | undefined): PanelRun {
  if (part === undefined) {
    throw new SheetError(`part ${sheet.id}`, 'the draft does not hold this part');
  }
  const matches =
    part.edges.length === sheet.edges.length &&
    sheet.edges.every((edge, rank) => part.edges[rank]?.id === edge.id);
  if (!matches) {
    throw new SheetError(`part ${sheet.id}`, 'the drafted edges are not those of the sheet');
  }
  const edges = sheet.edges.map((edge, rank): EdgeRun => ({
    panel: sheet.id,
    sheet: edge,
    role: structuralRoleOf(edge),
    pieces: piecesOf(part, part.edges[rank] as DraftedEdge),
  }));
  return { sheet, part, edges };
}

/**
 * Fond, dans chaque bord de la pièce, les droites qui se prolongent. À faire après la lecture des crans, qui suit les
 * segments du contour un à un.
 */
export function simplifyPanel(run: PanelRun): void {
  for (const edge of run.edges) edge.pieces = mergeCollinear(edge.pieces);
}

/** Boîte des sommets et des points de contrôle des pièces. */
function boundsOf(pieces: readonly Piece[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const points = pieces.flatMap((piece) =>
    piece.kind === 'line' ? [piece.p0, piece.p1] : [piece.p0, piece.c1, piece.c2, piece.p1],
  );
  const xs = points.map((point) => point.xMm);
  const ys = points.map((point) => point.yMm);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Droit fil de la pièce : de l'extrémité basse à l'extrémité haute, verticale à `xFraction` de la largeur côté positif. */
function grainlineOf(pieces: readonly Piece[], grain: GrainSheet): readonly [PointMm, PointMm] {
  const { maxX, minY, maxY } = boundsOf(pieces);
  const xMm = grain.xFraction * maxX;
  const at = (fraction: number): PointMm => ({ xMm, yMm: minY + fraction * (maxY - minY) });
  return [at(grain.lowFraction), at(grain.highFraction)];
}

function assertEdges(sheet: PartSheet, edges: readonly PatternEdge[]): void {
  if (edges.length < 3) throw new ContourError(sheet.part, 'a panel needs at least three edges');
  if (new Set(edges.map((edge) => edge.id)).size !== edges.length) {
    throw new SheetError(
      `part ${sheet.id}`,
      'edge identifiers are not unique once the edges are cut',
    );
  }
  edges.forEach((edge, rank) => {
    const next = edges[(rank + 1) % edges.length] as PatternEdge;
    if (!isNear(edge.piece.p1, next.piece.p0, CHAIN_TOLERANCE_MM)) {
      throw new ContourError(sheet.part, `edge "${edge.id}" does not lead to the next edge`);
    }
  });
  if (!(signedArea(edges.map((edge) => edge.piece)) > 0)) {
    throw new ContourError(sheet.part, 'the contour is not counter-clockwise');
  }
}

/** Une pièce coupée au pli a un seul bord de pli, droit et sur l'axe ; une autre n'en a aucun. */
function assertFold(sheet: PartSheet, edges: readonly PatternEdge[]): void {
  const folds = edges.filter((edge) => edge.role === 'fold');
  if (!sheet.panel.cutOnFold) {
    if (folds.length > 0)
      throw new SheetError(
        `part ${sheet.id}`,
        'a fold edge on a panel that is not cut on the fold',
      );
    return;
  }
  if (folds.length !== 1) {
    throw new SheetError(`part ${sheet.id}`, 'a panel cut on the fold needs exactly one fold edge');
  }
  const [fold] = folds as [PatternEdge];
  const onAxis =
    Math.abs(fold.piece.p0.xMm) <= FOLD_TOLERANCE_MM &&
    Math.abs(fold.piece.p1.xMm) <= FOLD_TOLERANCE_MM;
  if (fold.piece.kind !== 'line' || !onAxis) {
    throw new ContourError(
      sheet.part,
      'the fold edge is not a straight line on the axis of the part',
    );
  }
}

/** Limite du décalage d'ancrage que le contrat admet (`anchor.offsetMm`), en mm, dans les deux sens. */
export const MAX_OFFSET_MM = 500;

/** Écart permis entre le point d'ancrage et l'axe de la pièce. */
const AXIS_TOLERANCE_MM = 0.01;

/** Point nommé de la pièce, dans le repère de GarmentSpec ; erreur typée si la pièce ne l'a pas. */
function namedPoint(run: PanelRun, name: string): PointMm {
  const point = run.part.points[name];
  if (point === undefined) {
    throw new SheetError(
      `part ${run.sheet.id}`,
      `placement point "${name}" does not exist in the part`,
    );
  }
  return { xMm: point.xMm, yMm: -point.yMm };
}

/**
 * Pose de la pièce pour le contrat : l'ancre est le point nommé de l'axe (l'origine sans nom), son décalage celui de la fiche
 * plus la hauteur de l'ancre au-dessus du point de niveau, borné aux limites du contrat.
 */
function placementOf(run: PanelRun): PatternPlacement {
  const { placement } = run.sheet.panel;
  const origin: PointMm = { xMm: 0, yMm: 0 };
  const anchor =
    placement.anchorPoint === undefined ? origin : namedPoint(run, placement.anchorPoint);
  if (Math.abs(anchor.xMm) > AXIS_TOLERANCE_MM) {
    throw new SheetError(`part ${run.sheet.id}`, 'the anchor point is not on the axis of the part');
  }
  const level = placement.levelPoint === undefined ? anchor : namedPoint(run, placement.levelPoint);
  const offset = placement.offsetMm + (anchor.yMm - level.yMm);
  return {
    zone: placement.zone,
    bodySide: placement.bodySide,
    facing: placement.facing,
    landmark: placement.landmark,
    anchorMm: anchor,
    offsetMm: Math.max(-MAX_OFFSET_MM, Math.min(MAX_OFFSET_MM, offset)),
    clearanceMm: placement.clearanceMm,
  };
}

/** Les morceaux de chaque bord de la pièce, en bords de GarmentSpec, dans l'ordre du contour. */
function patternEdges(run: PanelRun): PatternEdge[] {
  return run.edges.flatMap((edge) =>
    edge.pieces.map((piece, rank) => ({
      id: subEdgeId(edge, rank),
      role: edge.role,
      semanticRole: edge.sheet.semanticRole,
      piece,
    })),
  );
}

/**
 * Termine une pièce, une fois ses coutures cousues : bords, droit fil, crans, pose. Contrôle le contour (au moins trois
 * bords, identifiants uniques, bords qui se raccordent, sens trigonométrique) et le pli. Erreur typée au premier défaut.
 */
export function finishPanel(run: PanelRun, notches: readonly PatternNotch[]): PatternPanel {
  const { sheet } = run;
  const edges = patternEdges(run);
  assertEdges(sheet, edges);
  assertFold(sheet, edges);
  const pieces = edges.map((edge) => edge.piece);
  const { panel } = sheet;
  return {
    id: sheet.id,
    name: panel.name,
    quantity: panel.quantity,
    cutOnFold: panel.cutOnFold,
    edges,
    ...(panel.grain === undefined ? {} : { grainline: grainlineOf(pieces, panel.grain) }),
    notches,
    placement: placementOf(run),
  };
}
