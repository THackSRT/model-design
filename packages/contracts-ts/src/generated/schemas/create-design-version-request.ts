// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres, qui dépendent du type. Longueurs en millimètres.
 */
export type GarmentRequest =
  StraightSkirtRequest | CircleSkirtRequest | TrousersRequest | BodiceRequest;

export interface CreateDesignVersionRequest {
  measurements: MeasurementSet;
  garment: GarmentRequest;
}
/**
 * Mesures du corps d'un client (ISO 8559-1), en millimètres entiers. Une mesure facultative absente est estimée par le moteur de patronage, qui la liste dans GarmentSpec.estimatedMeasurements.
 */
export interface MeasurementSet {
  sex: 'female' | 'male';
  statureMm: number;
  neckGirthMm?: number;
  chestGirthMm: number;
  waistGirthMm: number;
  hipGirthMm: number;
  upperArmGirthMm?: number;
  wristGirthMm?: number;
  thighGirthMm?: number;
  kneeGirthMm?: number;
  calfGirthMm?: number;
  ankleGirthMm?: number;
  crotchHeightMm?: number;
  /**
   * Tour de poitrine sur les pointes de seins (ISO 8559-1 : bust girth).
   */
  bustGirthMm?: number;
  /**
   * Tour de dessous de poitrine (ISO 8559-1 : underbust girth).
   */
  underBustGirthMm?: number;
  /**
   * Hauteur de la vertèbre cervicale saillante depuis le sol (ISO 8559-1 : cervicale height).
   */
  cervicaleHeightMm?: number;
  /**
   * Hauteur de la taille depuis le sol (ISO 8559-1 : waist height).
   */
  waistHeightMm?: number;
  /**
   * Hauteur des hanches (tour le plus fort) depuis le sol (ISO 8559-1 : hip height).
   */
  hipHeightMm?: number;
  /**
   * Longueur taille dos : de la cervicale à la taille, le long de la colonne (ISO 8559-1 : back waist length).
   */
  backWaistLengthMm?: number;
  /**
   * Longueur taille devant : du point d'encolure à l'épaule à la taille, par la pointe de sein (ISO 8559-1 : front waist length).
   */
  frontWaistLengthMm?: number;
  /**
   * Du point d'encolure à l'épaule à la pointe de sein (ISO 8559-1 : neck shoulder point to bust point).
   */
  neckShoulderToBustPointMm?: number;
  /**
   * Écart entre les pointes de seins (ISO 8559-1 : bust point width).
   */
  bustPointWidthMm?: number;
  /**
   * Carrure d'épaule à épaule, d'un point d'épaule à l'autre, par le dos (ISO 8559-1 : shoulder width).
   */
  shoulderWidthMm?: number;
  /**
   * Profondeur d'emmanchure : de la ligne d'épaule au niveau du dessous de bras (ISO 8559-1 : armscye depth).
   */
  armscyeDepthMm?: number;
  /**
   * Longueur de bras : du point d'épaule au poignet, coude légèrement plié (ISO 8559-1 : arm length).
   */
  armLengthMm?: number;
}
/**
 * Jupe droite à pinces.
 */
export interface StraightSkirtRequest {
  type: 'straight-skirt';
  params: StraightSkirtParams;
}
export interface StraightSkirtParams {
  lengthMm: number;
  waistEaseMm?: number;
  hipEaseMm?: number;
  hemFlareMm?: number;
}
/**
 * Jupe cercle (ou fraction de cercle).
 */
export interface CircleSkirtRequest {
  type: 'circle-skirt';
  params: CircleSkirtParams;
}
export interface CircleSkirtParams {
  /**
   * De la taille à l'ourlet.
   */
  lengthMm: number;
  waistEaseMm?: number;
  /**
   * Fraction de cercle de l'ourlet : 1 pour un cercle entier, 0,5 pour un demi-cercle (suns de GarmentCode).
   */
  circleFraction?: number;
  /**
   * Hauteur de la ceinture ; 0 : sans ceinture.
   */
  waistbandWidthMm?: 0 | number;
}
/**
 * Pantalon.
 */
export interface TrousersRequest {
  type: 'trousers';
  params: TrousersParams;
}
export interface TrousersParams {
  /**
   * De la taille à l'ourlet, sur le côté.
   */
  lengthMm: number;
  waistEaseMm?: number;
  hipEaseMm?: number;
  /**
   * Tour du bas de jambe. Absent : jambe droite depuis le genou.
   */
  hemGirthMm?: number;
}
/**
 * Corsage, avec ou sans manches.
 */
export interface BodiceRequest {
  type: 'bodice';
  params: BodiceParams;
}
export interface BodiceParams {
  /**
   * Longueur sous la taille ; 0 : arrêt à la taille.
   */
  lengthBelowWaistMm?: number;
  bustEaseMm?: number;
  waistEaseMm?: number;
  /**
   * Creusement de l'encolure devant sous l'encolure naturelle ; 0 : encolure naturelle.
   */
  frontNeckDepthMm?: number;
  /**
   * Creusement de l'encolure dos sous l'encolure naturelle ; 0 : encolure naturelle.
   */
  backNeckDepthMm?: number;
  sleeve?: SleeveParams;
}
/**
 * Manches. Absent : sans manches.
 */
export interface SleeveParams {
  /**
   * Du point d'épaule à l'ourlet.
   */
  lengthMm: number;
  /**
   * Embu de la tête de manche : la tête est plus longue que l'emmanchure de cette valeur.
   */
  capEaseMm?: number;
  /**
   * Tour du bas de manche. Absent : valeur choisie par le tracé.
   */
  hemGirthMm?: number;
}
