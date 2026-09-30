// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Nom de taille ou repère court (« 38 », « M », « MOD-002 »). Jeu de caractères restreint : il est écrit tel quel dans les exports (SVG, PDF, DXF). Jamais de nom de client.
 */
export type SizeLabel = string;
/**
 * [x, y] en millimètres.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Point = [number, number];
/**
 * [x, y] en millimètres.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Point1 = [number, number];
/**
 * Segment de deux points.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Segment = [Point, Point];
/**
 * Segment de deux points.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Segment1 = [Point, Point];
/**
 * Segment de deux points.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Segment2 = [Point, Point];
/**
 * [x, y] en millimètres.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Point2 = [number, number];

/**
 * Pièces de coupe : chaque pièce du patron avec sa ligne de couture, sa ligne de coupe (valeurs de couture ajoutées), ses crans, son droit fil et sa pliure. Coordonnées en millimètres dans le repère de la pièce de GarmentSpec (y vers le haut), arrondies à 0,01 mm.
 */
export interface CutPattern {
  unit: 'mm';
  engine: EngineRef;
  specEngine: EngineRef1;
  garment: {
    type: string;
  };
  sizeLabel?: SizeLabel;
  /**
   * @minItems 1
   */
  pieces: [CutPiece, ...CutPiece[]];
}
export interface EngineRef {
  name: string;
  version: string;
}
/**
 * Moteur qui a calculé la spécification d'entrée (GarmentSpec.engine).
 */
export interface EngineRef1 {
  name: string;
  version: string;
}
export interface CutPiece {
  panelId: string;
  name: string;
  /**
   * Nombre de pièces à couper par vêtement (Panel.quantity).
   */
  quantity: number;
  /**
   * Vrai : la pièce est dessinée à moitié et se coupe sur la pliure du tissu (voir foldLine).
   */
  cutOnFold: boolean;
  /**
   * Ligne de coupe : polygone fermé (le dernier point rejoint le premier, sans être répété), sens trigonométrique, courbes aplaties.
   *
   * @minItems 3
   */
  cutLine: [Point, Point, Point, ...Point[]];
  /**
   * Ligne de couture, bord par bord, dans l'ordre de Panel.edges ; la fin de chaque bord est le début du suivant.
   *
   * @minItems 3
   */
  seamLine: [SeamLineEdge, SeamLineEdge, SeamLineEdge, ...SeamLineEdge[]];
  notches: NotchMark[];
  grainline: Segment1;
  foldLine?: Segment2;
  labelAnchor: Point2;
  bounds: Bounds;
  /**
   * Aire de la ligne de coupe, en mm², telle que dessinée (moitié de pièce si cutOnFold).
   */
  cutAreaMm2: number;
}
export interface SeamLineEdge {
  edgeId: string;
  /**
   * Rôle du bord (Edge.role de GarmentSpec ; seam si absent).
   */
  role: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
  /**
   * Valeur de couture appliquée à ce bord (0 pour une pliure).
   */
  allowanceMm: number;
  /**
   * Polyligne du bord (courbe de Bézier aplatie), du début à la fin.
   *
   * @minItems 2
   */
  points: [Point, Point, ...Point[]];
}
export interface NotchMark {
  edgeId: string;
  /**
   * Distance le long de la ligne de couture depuis le début du bord.
   */
  distanceMm: number;
  count: number;
  source?: 'requested' | 'auto';
  position: Point1;
  /**
   * Entailles à couper (une par cran), de la ligne de coupe vers l'intérieur de la pièce.
   *
   * @minItems 1
   * @maxItems 3
   */
  segments: [Segment] | [Segment, Segment] | [Segment, Segment, Segment];
}
/**
 * Rectangle englobant de la ligne de coupe.
 */
export interface Bounds {
  min: Point;
  max: Point;
}
