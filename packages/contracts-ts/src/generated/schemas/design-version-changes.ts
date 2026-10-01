// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Type de vêtement et paramètres demandés, tels qu'envoyés.
 */
export type GarmentRequest =
  StraightSkirtRequest | CircleSkirtRequest | TrousersRequest | BodiceRequest;

/**
 * Ce qui change des entrées d'une version de modèle (to) par rapport à une autre (from) : paramètres du vêtement et mesures du client, valeurs telles qu'envoyées, sans appliquer les défauts. Seules les entrées différentes sont listées. Contient des mesures : réservé à l'organisation propriétaire, jamais gardé en cache ni journalisé. Longueurs en millimètres.
 */
export interface DesignVersionChanges {
  designId: string;
  from: DesignVersionSummary;
  to: DesignVersionSummary;
  /**
   * Vrai si les deux versions ont la même empreinte : mêmes mesures, mêmes paramètres, même version du moteur, donc même patron.
   */
  sameFingerprint: boolean;
  /**
   * Paramètres différents, triés par chemin.
   *
   * @maxItems 100
   */
  params: ParamChange[];
  /**
   * Mesures différentes, triées par nom.
   *
   * @maxItems 100
   */
  measurements: MeasurementChange[];
}
/**
 * Résumé d'une version de modèle, pour une liste : ni mesures du client ni patron (lire la version pour les obtenir). Longueurs des paramètres en millimètres.
 */
export interface DesignVersionSummary {
  number: number;
  createdAt: string;
  fingerprint: string;
  /**
   * Version du moteur de patronage qui a tracé le patron (spec.engine.version).
   */
  engineVersion: string;
  garment: GarmentRequest;
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
export interface ParamChange {
  /**
   * Chemin du paramètre dans GarmentRequest.params, points entre les niveaux (ex. lengthMm, sleeve.capEaseMm).
   */
  path: string;
  /**
   * Valeur dans la version from. Absent : paramètre absent (défaut du moteur).
   */
  from?: number | string | boolean;
  /**
   * Valeur dans la version to. Absent : paramètre absent (défaut du moteur).
   */
  to?: number | string | boolean;
}
export interface MeasurementChange {
  /**
   * Nom de champ de MeasurementSet (ex. waistGirthMm).
   */
  name: string;
  /**
   * Valeur dans la version from (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin).
   */
  from?: number | string;
  /**
   * Valeur dans la version to (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin).
   */
  to?: number | string;
}
