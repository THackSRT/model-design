import { midlineArc, type Curve } from './hull.js';
import type { Side } from './frames.js';
import type { LevelCurve } from './levels.js';
import type { PieceField } from './piece-field.js';

// Pantalon posé jambe par jambe (ADR 0013, « Pantalon jambe par jambe »). Une pièce de jambe (devant ou dos) est
// enroulée autour du tube de sa jambe, et non plus ancrée par son coin de taille : sous `crotch`, le milieu de
// l'isoligne de la pièce va au point extrême avant ou arrière de la coupe de la jambe ; au-dessus de `crotch` + 50 mm,
// le bout de l'isoligne côté milieu du corps (bord cousu à une pièce de l'autre côté) va au milieu devant ou dos de la
// demi-coupe du bassin ; entre les deux, la position est interpolée linéairement. Les pièces sont dessinées vues de
// dehors : l'abscisse croît dans le sens horaire de la coupe vue d'en haut.

/** Épaisseur de la zone de transition au-dessus de l'entrejambe, mm. */
export const PELVIS_BLEND_MM = 50;

/** Manière d'enrouler un sommet : départ sur la courbe, longueur de courbe disponible, décalage le long de la pièce. */
export interface WrapMode {
  /** Abscisse sur la courbe du point d'accroche de l'isoligne. */
  startArc: number;
  /** Longueur de courbe sur laquelle l'isoligne se pose (mm), base du facteur d'agrandissement. */
  usableLength: number;
  /** Abscisse du sommet moins celle du point d'accroche, le long de l'isoligne (mm). */
  offsetMm: number;
}

export interface LegModes {
  /** Mode « jambe » (sous l'entrejambe). */
  low: WrapMode;
  /** Mode « bassin » (au-dessus), absent si la coupe ne traverse pas le milieu. */
  high?: WrapMode;
  /** Poids du mode « bassin » : 0 sous l'entrejambe, 1 à 50 mm au-dessus. */
  weight: number;
}

export interface LegPiece {
  facing: 'front' | 'back';
  side: 'left' | 'right';
}

/** La pièce de jambe posée sur le devant ou le dos, d'un côté défini ; sinon `undefined`. */
export function legPieceOf(zone: string, side: Side, facing: string): LegPiece | undefined {
  if (zone !== 'leg' || (facing !== 'front' && facing !== 'back')) return undefined;
  if (side !== 'left' && side !== 'right') return undefined;
  return { facing, side };
}

export const pelvisWeight = (heightMm: number, crotchMm: number): number =>
  Math.max(0, Math.min(1, (heightMm - crotchMm) / PELVIS_BLEND_MM));

const modulo = (x: number, n: number): number => x - n * Math.floor(x / n);

/** Points de la courbe à moins de ce seuil du bord extrême sont des égaux (arête plate décalée), mm. */
const TIE_MM = 0.5;

/**
 * Abscisse du milieu de la face (avant ou dos) : milieu des points les plus avancés (ou reculés), pour qu'une arête
 * plate de la coupe ne décale pas la pièce d'un côté ou de l'autre selon l'ordre des points.
 */
function faceCentreArc(curve: Curve, front: boolean): number {
  const sign = front ? 1 : -1;
  const best = curve.points.reduce((m, p) => Math.max(m, sign * p[1]), -Infinity);
  const arcs: number[] = [];
  curve.points.forEach((p, i) => {
    if (sign * p[1] >= best - TIE_MM) arcs.push(curve.cumulative[i] as number);
  });
  const first = arcs[0] as number;
  const half = curve.length / 2;
  let sum = 0;
  for (const arc of arcs) sum += modulo(arc - first + half, curve.length) - half;
  return first + sum / arcs.length;
}

/** Point d'accroche : le milieu de l'isoligne (en abscisse sur la courbe) sur l'extrême avant ou arrière de la jambe. */
function lowMode(
  piece: LegPiece,
  level: LevelCurve,
  field: PieceField,
  at: { s: number; d: number },
): WrapMode {
  const [lo, hi] = field.span(at.d);
  const mid = (field.abscissa(lo, at.d) + field.abscissa(hi, at.d)) / 2;
  return {
    startArc: faceCentreArc(level.curve, piece.facing === 'front'),
    usableLength: level.curve.length,
    offsetMm: field.abscissa(at.s, at.d) - mid,
  };
}

/**
 * Bout de l'isoligne côté milieu du corps sur le milieu de la face de la demi-coupe du bassin. Le bout est du côté
 * des s forts pour une pièce de devant de la jambe droite ou de dos de la jambe gauche (sens horaire : vers
 * l'extérieur de la jambe gauche devant, vers l'intérieur derrière). La longueur disponible est l'arc extérieur
 * entre le milieu devant et le milieu dos.
 */
function highMode(
  piece: LegPiece,
  level: LevelCurve,
  field: PieceField,
  at: { s: number; d: number },
): WrapMode | undefined {
  const { curve } = level;
  const front = midlineArc(curve, true);
  const back = midlineArc(curve, false);
  if (front < 0 || back < 0) return undefined;
  const outer =
    piece.side === 'left' ? modulo(back - front, curve.length) : modulo(front - back, curve.length);
  if (outer < 1) return undefined;
  const [lo, hi] = field.span(at.d);
  const atHigh = (piece.facing === 'front') !== (piece.side === 'left');
  return {
    startArc: piece.facing === 'front' ? front : back,
    usableLength: outer,
    offsetMm: field.abscissa(at.s, at.d) - field.abscissa(atHigh ? hi : lo, at.d),
  };
}

/** Modes d'enroulement du sommet (s, d) de `field`, à la hauteur `heightMm` sur le corps. */
export function legModes(
  piece: LegPiece,
  level: LevelCurve,
  field: PieceField,
  at: { s: number; d: number; heightMm: number; crotchMm: number },
): LegModes {
  const low = lowMode(piece, level, field, at);
  const weight = pelvisWeight(at.heightMm, at.crotchMm);
  if (weight <= 0) return { low, weight: 0 };
  const high = highMode(piece, level, field, at);
  return high ? { low, high, weight } : { low, weight: 0 };
}
