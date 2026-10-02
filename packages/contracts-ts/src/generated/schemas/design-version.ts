// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres, qui dépendent du type. Longueurs en millimètres.
 */
export type GarmentRequest =
  StraightSkirtRequest | CircleSkirtRequest | TrousersRequest | BodiceRequest;
/**
 * [x, y] en millimètres, chaque coordonnée entre -10 000 et 10 000 mm (10 m, bornes comprises) : un vêtement réel tient sous 3 m ; la borne refuse une entrée hostile dès la validation (ADR 0013, MAX_COORDINATE_MM du drapé).
 *
 * @minItems 2
 * @maxItems 2
 */
export type Point = [number, number];
/**
 * Cran d'une pièce : un emplacement (NotchPlacement) sur un de ses bords.
 */
export type Notch = NotchPlacement;

export interface DesignVersion {
  designId: string;
  number: number;
  createdAt: string;
  measurements: MeasurementSet;
  garment: GarmentRequest;
  fingerprint: string;
  spec: GarmentSpec;
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
/**
 * Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat, vues côté endroit du tissu, contour dans le sens trigonométrique.
 */
export interface GarmentSpec {
  specVersion: '1.0';
  unit: 'mm';
  engine: {
    name: string;
    version: string;
  };
  garment: {
    type: string;
  };
  /**
   * @minItems 1
   */
  panels: [Panel, ...Panel[]];
  seams: Seam[];
  /**
   * Mesures absentes de la demande, estimées par le moteur : noms de champs de MeasurementSet (ex. bustGirthMm). Absent ou vide : aucune estimation.
   */
  estimatedMeasurements?: string[];
}
export interface Panel {
  id: string;
  name: string;
  /**
   * Contour fermé, dans le sens trigonométrique : la fin de chaque bord est le début du suivant.
   *
   * @minItems 3
   */
  edges: [Edge, Edge, Edge, ...Edge[]];
  /**
   * Droit fil : deux points.
   *
   * @minItems 2
   * @maxItems 2
   */
  grainline?: [Point, Point];
  /**
   * Nombre de pièces à couper.
   */
  quantity: number;
  cutOnFold?: boolean;
  /**
   * Crans posés par le moteur de patronage (tête de manche, ligne des hanches, milieux).
   *
   * @maxItems 200
   */
  notches?: Notch[];
  placement?: PanelPlacement;
}
export interface Edge {
  id: string;
  from: Point;
  to: Point;
  /**
   * Points de contrôle d'une courbe de Bézier (1 : quadratique, 2 : cubique). Absent : segment droit.
   *
   * @maxItems 2
   */
  controls?: [] | [Point] | [Point, Point];
  role?: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
}
/**
 * Emplacement d'un cran, seule définition partagée par Panel.notches (Notch) et la fabrication (NotchRequest) : sur la ligne de couture du bord edgeId, à distanceMm de son début (from), mesurée le long du bord. Ouvert pour être étendu (allOf) ; Notch et NotchRequest le ferment.
 */
export interface NotchPlacement {
  edgeId: string;
  distanceMm: number;
  /**
   * Cran simple, double (dos, par convention) ou triple.
   */
  count?: number;
}
/**
 * Pose de la pièce autour du corps, pour l'habillage et le drapé (ADR 0013). Facultative : sans elle, la pièce ne peut pas être drapée. Une pièce cutOnFold est dépliée par symétrie sur son bord de rôle fold, sa moitié dessinée allant du côté bodySide. Une pièce quantity: 2 donne deux exemplaires : une copie telle que dessinée du côté bodySide et une copie retournée (miroir) de l'autre côté du porteur.
 */
export interface PanelPlacement {
  /**
   * Partie du corps autour de laquelle la pièce s'enroule.
   */
  zone: 'torso' | 'leg' | 'arm';
  /**
   * Côté du porteur (sa gauche, sa droite, ou à cheval sur le milieu) où va la pièce telle que dessinée.
   */
  bodySide: 'left' | 'right' | 'center';
  /**
   * Face du corps vers laquelle regarde l'endroit de la pièce ; outer pour une pièce enroulée autour d'un membre.
   */
  facing: 'front' | 'back' | 'outer';
  /**
   * Point de la pièce posé sur la ligne médiane de la face facing, à la hauteur du repère landmark plus offsetMm.
   */
  anchor: {
    point: Point;
    /**
     * Repère de hauteur du corps ajusté.
     */
    landmark: 'neck' | 'shoulder' | 'waist' | 'hip' | 'crotch' | 'knee' | 'ankle' | 'wrist';
    /**
     * Décalage vertical depuis le repère, en millimètres, positif vers le haut.
     */
    offsetMm?: number;
  };
  /**
   * Distance au corps de la position de départ, en millimètres.
   */
  clearanceMm?: number;
}
/**
 * Couture entre deux bords. Convention, une fois les pièces dépliées (cutOnFold) et les copies retournées (quantity: 2) posées (PanelPlacement) : a se coud de son début (from) vers sa fin sur b de sa fin vers son début (sens opposés). Une couture entre deux bords présents des deux côtés du porteur est dupliquée côté par côté (gauche avec gauche, droite avec droite) ; entre un bord présent des deux côtés et un bord d'un seul côté, elle prend la copie de ce côté. EdgeRef.side force la copie quand la règle ne suffit pas.
 */
export interface Seam {
  id: string;
  a: EdgeRef;
  b: EdgeRef;
  /**
   * Embu : le bord a est plus long que le bord b de cette valeur, qui se répartit en le cousant sur b (ex. tête de manche). Absent : 0, les deux bords ont la même longueur.
   */
  easeMm?: number;
}
export interface EdgeRef {
  panelId: string;
  edgeId: string;
  /**
   * Exemplaire du bord à coudre, côté du porteur, quand la règle de la couture (Seam) ne suffit pas. Absent : règle de Seam.
   */
  side?: 'left' | 'right';
}
