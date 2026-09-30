// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * [x, y] en millimètres.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Point = [number, number];
/**
 * Nom de taille ou repère court (« 38 », « M », « MOD-002 »). Jeu de caractères restreint : il est écrit tel quel dans les exports (SVG, PDF, DXF). Jamais de nom de client.
 */
export type SizeLabel = string;

/**
 * Demande de pièces de coupe : une spécification de patron et la façon de la finir.
 */
export interface CutPatternRequest {
  spec: GarmentSpec;
  finishing?: FinishingOptions;
  sizeLabel?: SizeLabel;
}
/**
 * Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat.
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
export interface Seam {
  id: string;
  a: EdgeRef;
  b: EdgeRef;
}
export interface EdgeRef {
  panelId: string;
  edgeId: string;
}
/**
 * Comment finir les pièces d'un patron : valeurs de couture et crans. Longueurs en millimètres. Absent : valeurs par défaut du moteur (10 mm partout, 30 mm aux ourlets, crans aux raccords de couture).
 */
export interface FinishingOptions {
  seamAllowances?: SeamAllowances;
  /**
   * Crans demandés en plus des crans automatiques.
   *
   * @maxItems 200
   */
  notches?: NotchRequest[];
  /**
   * none : aucun cran automatique. seam-junctions : un cran à chaque jonction de deux bords cousus presque alignés (écart de direction inférieur à 30°), par exemple la ligne de hanches d'une couture de côté.
   */
  autoNotches?: 'none' | 'seam-junctions';
}
/**
 * Priorité : byEdge, puis byRole, puis defaultMm. Un bord de pliure (role fold) n'a jamais de valeur de couture. Si seamAllowances est absent, le moteur applique defaultMm = 10 et byRole.hem = 30.
 */
export interface SeamAllowances {
  defaultMm?: number;
  byRole?: RoleAllowances;
  /**
   * @maxItems 500
   */
  byEdge?: EdgeAllowance[];
}
/**
 * Valeur de couture par rôle de bord (voir Edge.role de GarmentSpec). Un bord sans rôle est traité comme une couture (seam).
 */
export interface RoleAllowances {
  seam?: number;
  hem?: number;
  waistline?: number;
  opening?: number;
}
export interface EdgeAllowance {
  panelId: string;
  edgeId: string;
  allowanceMm: number;
}
/**
 * Cran placé sur la ligne de couture d'un bord, à distanceMm de son début (from), mesurée le long du bord.
 */
export interface NotchRequest {
  panelId: string;
  edgeId: string;
  distanceMm: number;
  /**
   * Cran simple, double (dos, par convention) ou triple.
   */
  count?: number;
}
