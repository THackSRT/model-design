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
 * Plan de coupe : placement des pièces sur la laize, métrage et efficience. Repère du plan en millimètres : x le long du tissu (droit fil), de 0 à fabricLengthMm ; y en travers, de 0 à usableWidthMm, y = 0 sur la pliure (folded) ou à la marge de la lisière (single).
 */
export interface CuttingPlan {
  unit: 'mm';
  engine: EngineRef;
  fabricWidthMm: number;
  /**
   * Largeur où l'on place les pièces : laize moins les marges de lisière, divisée par deux si le tissu est plié.
   */
  usableWidthMm: number;
  layout: 'single' | 'folded';
  direction: 'one-way' | 'two-way';
  /**
   * Métrage : longueur de tissu à couper, arrondie au millimètre supérieur.
   */
  fabricLengthMm: number;
  /**
   * Aire des pièces placées divisée par l'aire utilisée (usableWidthMm × fabricLengthMm), de 0 à 1, arrondie à 4 décimales.
   */
  efficiency: number;
  /**
   * Nombre de pièces obtenues à la coupe.
   */
  pieceCount: number;
  /**
   * Pièces coupées en trop (quantité impaire sur tissu plié).
   */
  surplusPieceCount: number;
  placements: Placement[];
}
export interface EngineRef {
  name: string;
  version: string;
}
export interface Placement {
  garmentLabel: SizeLabel;
  panelId: string;
  /**
   * Numéro de placement de cette pièce pour ce vêtement (à partir de 1).
   */
  copy: number;
  /**
   * Pièces obtenues par ce placement : 2 sur tissu plié, 1 sinon ou pour une pièce sur pliure.
   */
  plies: number;
  /**
   * Rotation appliquée à la pièce (repère de GarmentSpec) pour aligner son droit fil sur x, plus 180° si la pièce est retournée.
   */
  rotationDeg: number;
  /**
   * Vrai : la pièce est placée en symétrique (paire gauche / droite sur tissu à plat).
   */
  mirrored: boolean;
  /**
   * Vrai : le bord de pliure de la pièce est posé sur la pliure du tissu (y = 0).
   */
  onFold: boolean;
  /**
   * Ligne de coupe placée, dans le repère du plan (dépliée si la pièce sur pliure est coupée à plat).
   *
   * @minItems 3
   */
  outline: [Point, Point, Point, ...Point[]];
}
