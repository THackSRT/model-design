// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * [x, y] en millimètres.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Point = [number, number];

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
