import {
  cubicLengthMm,
  cubicPointAt,
  distanceMm,
  lerp,
  parameterAtLength,
  splitCubic,
} from './curve.js';
import type { Cubic } from './curve.js';
import type { PointMm, Segment } from './types.js';

/** Droite d'un bord de patron. */
export interface LinePiece {
  readonly kind: 'line';
  readonly p0: PointMm;
  readonly p1: PointMm;
  readonly lengthMm: number;
}

/** Courbe de Bézier cubique d'un bord de patron. */
export interface CurvePiece {
  readonly kind: 'curve';
  readonly p0: PointMm;
  readonly c1: PointMm;
  readonly c2: PointMm;
  readonly p1: PointMm;
  readonly lengthMm: number;
}

/**
 * Pièce d'un bord de patron : une droite ou une seule courbe de Bézier cubique, car le contrat n'admet rien d'autre par
 * bord. Valeurs brutes en mm, avec la longueur ; une pièce ne change jamais, une découpe en rend de nouvelles.
 */
export type Piece = LinePiece | CurvePiece;

export const linePiece = (p0: PointMm, p1: PointMm): LinePiece => ({
  kind: 'line',
  p0,
  p1,
  lengthMm: distanceMm(p0, p1),
});

export const curvePiece = ({ p0, c1, c2, p3 }: Cubic): CurvePiece => ({
  kind: 'curve',
  p0,
  c1,
  c2,
  p1: p3,
  lengthMm: cubicLengthMm(p0, c1, c2, p3),
});

const cubicOf = (piece: CurvePiece): Cubic => ({
  p0: piece.p0,
  c1: piece.c1,
  c2: piece.c2,
  p3: piece.p1,
});

/** Pièce d'un segment du contour ; `undefined` pour une courbe sans points de contrôle (contour incohérent). */
export function pieceOfSegment(segment: Segment, vertices: readonly PointMm[]): Piece | undefined {
  const p0 = vertices[segment.from] as PointMm;
  const p3 = vertices[segment.to] as PointMm;
  if (segment.kind === 'line') return linePiece(p0, p3);
  if (segment.cp1 === undefined || segment.cp2 === undefined) return undefined;
  return curvePiece({ p0, c1: segment.cp1, c2: segment.cp2, p3 });
}

const flipPoint = (point: PointMm): PointMm => ({ xMm: point.xMm, yMm: -point.yMm });

/** La pièce vue dans le repère de GarmentSpec (y vers le haut) : l'ordonnée change de signe, la longueur reste. */
export function flipPiece(piece: Piece): Piece {
  if (piece.kind === 'line') return { ...piece, p0: flipPoint(piece.p0), p1: flipPoint(piece.p1) };
  return {
    ...piece,
    p0: flipPoint(piece.p0),
    c1: flipPoint(piece.c1),
    c2: flipPoint(piece.c2),
    p1: flipPoint(piece.p1),
  };
}

/** La même pièce parcourue en sens inverse (la longueur est reprise telle quelle). */
export function reversePiece(piece: Piece): Piece {
  if (piece.kind === 'line') return { ...piece, p0: piece.p1, p1: piece.p0 };
  return { ...piece, p0: piece.p1, c1: piece.c2, c2: piece.c1, p1: piece.p0 };
}

/**
 * Coupe la pièce à `distanceMm` de son début (strictement entre 0 et sa longueur) : deux pièces qui se raccordent
 * exactement, la première de cette longueur. La courbe garde sa forme (de Casteljau, au paramètre qui donne la longueur).
 */
export function splitPiece(piece: Piece, distanceMm: number): readonly [Piece, Piece] {
  if (piece.kind === 'line') {
    const middle = lerp(piece.p0, piece.p1, distanceMm / piece.lengthMm);
    return [linePiece(piece.p0, middle), linePiece(middle, piece.p1)];
  }
  const curve = cubicOf(piece);
  const [head, tail] = splitCubic(curve, parameterAtLength(curve, distanceMm));
  return [curvePiece(head), curvePiece(tail)];
}

export const piecesLength = (pieces: readonly Piece[]): number =>
  pieces.reduce((total, piece) => total + piece.lengthMm, 0);

/** Sinus de l'angle au plus entre deux droites consécutives pour qu'elles n'en fassent qu'une (3e-4 mm sur 300 mm). */
const COLLINEAR_SINE = 1e-6;

/** Les deux droites sont sur une même droite, parcourues dans le même sens ou en sens contraire. */
function collinear(line: LinePiece, next: LinePiece): boolean {
  const ax = line.p1.xMm - line.p0.xMm;
  const ay = line.p1.yMm - line.p0.yMm;
  const bx = next.p1.xMm - next.p0.xMm;
  const by = next.p1.yMm - next.p0.yMm;
  return Math.abs(ax * by - ay * bx) <= COLLINEAR_SINE * line.lengthMm * next.lengthMm;
}

/**
 * Fond les droites consécutives d'une même droite en une seule, du début de la première à la fin de la dernière.
 * FreeSewing met un sommet là où une option déplace un point (la ligne des hanches sur le milieu dos, quand `lengthBonus`
 * allonge le bas), et trace un aller-retour sur le milieu dos quand `lengthBonus` le raccourcit (le dos descend aux
 * hanches puis remonte à l'ourlet) : le contrat veut une seule droite, qui est le pli d'une pièce coupée au pli.
 */
export function mergeCollinear(pieces: readonly Piece[]): Piece[] {
  const merged: Piece[] = [];
  for (const piece of pieces) {
    const last = merged[merged.length - 1];
    if (last?.kind === 'line' && piece.kind === 'line' && collinear(last, piece)) {
      merged[merged.length - 1] = linePiece(last.p0, piece.p1);
    } else {
      merged.push(piece);
    }
  }
  return merged;
}

/** Points par courbe de l'échantillonnage qui sert à l'aire. */
const AREA_SAMPLES = 16;

function sampled(piece: Piece): PointMm[] {
  if (piece.kind === 'line') return [piece.p0];
  const curve = cubicOf(piece);
  return Array.from({ length: AREA_SAMPLES }, (_, i) => cubicPointAt(curve, i / AREA_SAMPLES));
}

/**
 * Aire signée du contour que forment les pièces mises bout à bout (courbes échantillonnées) : positive si le contour est
 * trigonométrique dans un repère aux ordonnées vers le haut.
 */
export function signedArea(pieces: readonly Piece[]): number {
  const polygon = pieces.flatMap(sampled);
  let twice = 0;
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length] as PointMm;
    twice += point.xMm * next.yMm - next.xMm * point.yMm;
  });
  return twice / 2;
}
