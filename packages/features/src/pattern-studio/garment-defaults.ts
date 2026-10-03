/**
 * Longueurs de vêtement estimées depuis le corps. Rapports anthropométriques moyens de la stature
 * (Drillis et Contini, « Body segment parameters », 1966) : des ordres de grandeur pour proposer une valeur de
 * départ, jamais une mesure. Toute valeur proposée reste modifiable dans le formulaire.
 */

/** Hauteur de la taille depuis le sol, en part de la stature (utilisée si `waistHeightMm` manque). */
export const WAIST_HEIGHT_RATIO = 0.62;
/** Hauteur du genou depuis le sol, en part de la stature : l'ourlet d'une jupe « au genou ». */
export const KNEE_HEIGHT_RATIO = 0.285;
/** Hauteur de la cheville depuis le sol, en part de la stature : l'ourlet d'un pantalon « à la cheville ». */
export const ANKLE_HEIGHT_RATIO = 0.039;
/** Longueur du bras (épaule au poignet), en part de la stature (utilisée si `armLengthMm` manque). */
export const ARM_LENGTH_RATIO = 0.33;

/** Mesures du corps (mm) qui servent à estimer une longueur ; toutes facultatives. */
export interface BodyLengthsMm {
  statureMm?: number;
  waistHeightMm?: number;
  armLengthMm?: number;
}

export type LengthKind = 'skirt' | 'trousers' | 'sleeve';

const round = (mm: number) => Math.round(mm);

/** Hauteur de la taille : mesurée, sinon estimée depuis la stature. */
export function waistHeightMm(body: BodyLengthsMm): number | undefined {
  if (body.waistHeightMm !== undefined) return body.waistHeightMm;
  return body.statureMm === undefined ? undefined : round(body.statureMm * WAIST_HEIGHT_RATIO);
}

function fromWaist(body: BodyLengthsMm, floorRatio: number): number | undefined {
  const waist = waistHeightMm(body);
  if (waist === undefined || body.statureMm === undefined) return undefined;
  return waist - round(body.statureMm * floorRatio);
}

/** Longueur de départ (mm, non bornée) : jupe au genou, pantalon à la cheville, manche longue. */
export function defaultLengthMm(kind: LengthKind, body: BodyLengthsMm): number | undefined {
  if (kind === 'skirt') return fromWaist(body, KNEE_HEIGHT_RATIO);
  if (kind === 'trousers') return fromWaist(body, ANKLE_HEIGHT_RATIO);
  if (body.armLengthMm !== undefined) return body.armLengthMm;
  return body.statureMm === undefined ? undefined : round(body.statureMm * ARM_LENGTH_RATIO);
}
