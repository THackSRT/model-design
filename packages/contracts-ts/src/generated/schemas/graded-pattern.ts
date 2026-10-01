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
 * Patron gradué : les pièces de coupe de chaque taille, alignées, et les écarts de gradation de chaque sommet de la ligne de couture par rapport à la taille de base. Millimètres.
 */
export interface GradedPattern {
  unit: 'mm';
  engine: EngineRef;
  baseSize: SizeLabel;
  /**
   * Dans l'ordre de la demande.
   *
   * @minItems 2
   */
  sizes: [SizedCutPattern, SizedCutPattern, ...SizedCutPattern[]];
  /**
   * Une entrée par pièce, dans l'ordre des pièces.
   */
  gradeRules: PanelGradeRule[];
}
export interface EngineRef {
  name: string;
  version: string;
}
export interface SizedCutPattern {
  size: SizeLabel;
  /**
   * @minItems 1
   */
  pieces: [CutPiece, ...CutPiece[]];
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
export interface PanelGradeRule {
  panelId: string;
  /**
   * Un sommet par bord : le début (from) du bord edgeId, sur la ligne de couture.
   */
  vertices: VertexGradeRule[];
}
export interface VertexGradeRule {
  edgeId: string;
  /**
   * Écart de ce sommet pour chaque taille par rapport à la taille de base (0 pour la base), dans l'ordre des tailles.
   */
  deltas: SizeDelta[];
}
export interface SizeDelta {
  size: SizeLabel;
  dxMm: number;
  dyMm: number;
}
