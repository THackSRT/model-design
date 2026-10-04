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
 * Mesures du corps d'un client (ISO 8559-1, complétées des mesures de FreeSewing qu'elle n'a pas), en millimètres entiers (suffixe Mm) ; la pente d'épaule en degrés entiers (suffixe Deg). Données personnelles sensibles : jamais journalisées. Une mesure facultative absente est estimée par le moteur (patronage, tracé ou mannequin) ; le patronage la liste dans GarmentSpec.estimatedMeasurements. Correspondance avec les noms FreeSewing : docs/composants/contrats.md.
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
  /**
   * Tour de hanches hautes, horizontal, à la hauteur du sommet des crêtes iliaques, entre la taille et le tour de bassin (FreeSewing : hips). Distinct de hipGirthMm, le tour le plus fort (FreeSewing : seat).
   */
  upperHipGirthMm?: number;
  /**
   * Part dos du tour de taille : d'un point de côté à l'autre en passant par le dos, le long du corps (FreeSewing : waistBack ; son waistBackArc en est la moitié).
   */
  waistGirthBackMm?: number;
  /**
   * Part dos du tour de bassin (hipGirthMm) : d'un point de côté à l'autre en passant par le dos, le long du corps (FreeSewing : seatBack ; son seatBackArc en est la moitié).
   */
  hipGirthBackMm?: number;
  /**
   * Pente d'épaule, en degrés sous l'horizontale : angle de la droite qui va du point d'encolure à l'épaule (côté du cou) au point d'épaule, vue de face (FreeSewing : shoulderSlope).
   */
  shoulderSlopeDeg?: number;
  /**
   * De la taille au creux de l'aisselle, verticalement, sur le côté du corps (FreeSewing : waistToArmpit).
   */
  waistToArmpitMm?: number;
  /**
   * De la taille au niveau des hanches hautes (upperHipGirthMm), verticalement, sur le côté du corps (FreeSewing : waistToHips).
   */
  waistToUpperHipMm?: number;
  /**
   * Longueur de fourche (montant total) : de la taille au milieu devant, entre les jambes, jusqu'à la taille au milieu dos, le long du corps (ISO 8559-1 : crotch length ; FreeSewing : crossSeam).
   */
  crotchLengthMm?: number;
  /**
   * Part devant de la longueur de fourche : de la taille au milieu devant jusqu'au point de fourche, le plus bas du tronc entre les jambes, le long du corps ; la part dos vaut crotchLengthMm moins cette mesure (FreeSewing : crossSeamFront).
   */
  frontCrotchLengthMm?: number;
  /**
   * De la taille au niveau du tour de cuisse (thighGirthMm, juste sous l'entrejambe), verticalement, sur le côté du corps (FreeSewing : waistToUpperLeg).
   */
  waistToThighMm?: number;
  /**
   * Tour de poitrine haute, horizontal, sous les bras et au-dessus de la poitrine (FreeSewing : highBust).
   */
  highBustGirthMm?: number;
  /**
   * Hauteur du genou depuis le sol, verticalement (ISO 8559-1 : knee height). Le waistToKnee de FreeSewing vaut waistHeightMm moins cette hauteur.
   */
  kneeHeightMm?: number;
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
