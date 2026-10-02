// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Taille ou repère du vêtement, reporté sur chaque placement.
 */
export type SizeLabel = string;
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
/**
 * Cran demandé sur la pièce panelId : un emplacement (NotchPlacement de GarmentSpec : edgeId, distanceMm, count) sur la ligne de couture d'un de ses bords.
 */
export type NotchRequest = NotchPlacement & {
  panelId: string;
};
/**
 * Sens du tissu. one-way : tissu à sens (velours, motif orienté), toutes les pièces dans le même sens. two-way : une pièce peut être tournée de 180°.
 */
export type FabricDirection = 'one-way' | 'two-way';

/**
 * Demande de plan de coupe : les vêtements à couper (une spécification et un nombre d'exemplaires chacun), la finition et le tissu. Millimètres.
 */
export interface CuttingPlanRequest {
  /**
   * @minItems 1
   * @maxItems 20
   */
  garments:
    | [GarmentToCut]
    | [GarmentToCut, GarmentToCut]
    | [GarmentToCut, GarmentToCut, GarmentToCut]
    | [GarmentToCut, GarmentToCut, GarmentToCut, GarmentToCut]
    | [GarmentToCut, GarmentToCut, GarmentToCut, GarmentToCut, GarmentToCut]
    | [GarmentToCut, GarmentToCut, GarmentToCut, GarmentToCut, GarmentToCut, GarmentToCut]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ]
    | [
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
        GarmentToCut,
      ];
  finishing?: FinishingOptions;
  fabric: FabricLayout;
  /**
   * Écart minimal entre deux pièces.
   */
  spacingMm?: number;
}
export interface GarmentToCut {
  label: SizeLabel;
  spec: GarmentSpec;
  /**
   * Nombre d'exemplaires du vêtement.
   */
  count?: number;
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
   * none : aucun cran automatique. seam-junctions : un cran à chaque jonction de deux bords cousus presque alignés (écart de direction inférieur à 30°), par exemple la ligne de hanches d'une couture de côté, et un cran aux deux extrémités de chaque pince (pince franchie par la ligne de coupe).
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
export interface FabricLayout {
  /**
   * Laize, lisières comprises.
   */
  fabricWidthMm: number;
  /**
   * single : tissu à plat, une épaisseur (les pièces sur pliure sont dépliées). folded : tissu plié en deux dans le droit fil, deux épaisseurs (une pièce placée donne une paire symétrique ; une pièce sur pliure pose son bord de pliure sur la pliure du tissu).
   */
  layout?: 'single' | 'folded';
  direction?: FabricDirection;
  /**
   * Marge laissée le long de chaque lisière.
   */
  selvedgeMarginMm?: number;
}
