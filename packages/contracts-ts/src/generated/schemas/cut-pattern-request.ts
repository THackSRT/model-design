// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

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
 * Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat, vues côté endroit du tissu, contour dans le sens trigonométrique. La version 1.1 (ADR 0020) ajoute, tous facultatifs, le rôle sémantique des bords, les matières, les pièces entoilées et les marques de pose : une spécification 1.0 reste valide.
 */
export interface GarmentSpec {
  /**
   * Version du format. Un producteur écrit 1.1 dès qu'il remplit un champ de la version 1.1 (materials, Panel.material, Panel.interfaced, Panel.marks, Edge.semanticRole), 1.0 sinon ; un lecteur 1.1 lit les deux.
   */
  specVersion: '1.0' | '1.1';
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
  /**
   * Table des matières du vêtement (1.1), par clé au format MaterialKey : Panel.material et LineMark.material y renvoient, et toute clé citée y figure. Absente : matière unique, non nommée.
   */
  materials?: {
    [k: string]: Material;
  };
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
   * Crans posés par le moteur (tête de manche et emmanchures, milieux, ligne des hanches, arrêt de fente). Sur un bord cousu avec embu (Seam.easeMm), le cran se place le long de ce bord, embu compris : le cran qui lui répond sur l'autre bord n'est pas à la même distance.
   *
   * @maxItems 200
   */
  notches?: Notch[];
  placement?: PanelPlacement;
  /**
   * Matière de la pièce (1.1) : clé de GarmentSpec.materials. Absente : matière non précisée ; la coupe regroupe ces pièces dans une même matière.
   */
  material?: string;
  /**
   * Pièce entoilée (1.1) : elle se coupe aussi dans l'entoilage, même forme et même nombre. Absent : pièce non entoilée.
   */
  interfaced?: boolean;
  /**
   * Marques de pose de la pièce (1.1, ADR 0020) : poche, galon, boutons, fentes, zone de broderie, plis. Absent ou vide : aucune marque.
   *
   * @maxItems 100
   *
   * Items: Marque de pose d'une pièce (1.1, ADR 0020), dans le repère de la pièce dessinée (mm, y vers le haut, vue côté endroit, comme ses bords), selon kind : line (ligne ouverte), outline (contour fermé), button (bouton), slit (fente à couper), zone (zone fermée à orner), fold (ligne de pli intérieure). Un contour fermé ne répète pas son premier point.
   */
  marks?: (LineMark | OutlineMark | ButtonMark | SlitMark | ZoneMark | FoldMark)[];
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
  /**
   * Rôle structurel : comment le bord se coupe et se finit (valeur de couture par rôle, pliure). seam : couture ; fold : pliure de coupe d'une pièce cutOnFold ; hem : ourlet ; waistline : bord de taille ; opening : bord laissé libre (ex. encolure). Absent : seam. Où se trouve le bord sur le vêtement : semanticRole.
   */
  role?: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
  /**
   * Rôle sémantique d'un bord (1.1) : où il se trouve sur le vêtement. Les opérations du document de modèle (ADR 0020) ne lisent que ces rôles et des repères ; la coupe et les crans s'en servent aussi. Indépendant du rôle structurel (role). neckline : encolure ; shoulder : épaule ; armhole : emmanchure ; side : côté (couture de côté du corps ou de la jupe) ; hem : bas du vêtement (corps, jupe ou jambe) ; centerFront : milieu devant ; centerBack : milieu dos ; sleeveCap : tête de manche ; underarm : dessous de bras (couture de la manche) ; sleeveHem : bas de manche (ourlet ou montage du poignet) ; waist : taille ; inseam : entrejambe ; outseam : côté extérieur de jambe ; rise : montant (couture de fourche, de la taille à l'entrejambe) ; dart : jambe de pince ; styleLine : découpe (couture entre deux régions d'une même face : plastron, empiècement, bande rapportée, bloc de couleur). Un bord coupé en sous-bords garde son rôle sur chacun. Absent : bord sans rôle connu (pièce ajoutée : poche, patte…).
   */
  semanticRole?:
    | 'neckline'
    | 'shoulder'
    | 'armhole'
    | 'side'
    | 'hem'
    | 'centerFront'
    | 'centerBack'
    | 'sleeveCap'
    | 'underarm'
    | 'sleeveHem'
    | 'waist'
    | 'inseam'
    | 'outseam'
    | 'rise'
    | 'dart'
    | 'styleLine';
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
 * Ligne de pose ouverte (polyligne), par exemple l'axe d'un galon cousu en surface.
 */
export interface LineMark {
  kind: 'line';
  /**
   * Points de la ligne, dans l'ordre.
   *
   * @minItems 2
   * @maxItems 1000
   */
  points: [Point, Point, ...Point[]];
  /**
   * Matière posée sur la ligne (ex. galon) : clé de GarmentSpec.materials. Absente : simple repère.
   */
  material?: string;
  /**
   * Largeur de ce qui se pose sur la ligne (ex. galon), en millimètres ; la ligne en est l'axe.
   */
  widthMm?: number;
  /**
   * Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.
   */
  label?: string;
  /**
   * Exemplaire de la pièce qui porte la marque, pour une pièce au pli ou en double (quantity: 2) : drawn, la pièce telle que dessinée (la moitié dessinée d'une pièce au pli) ; mirrored, sa copie retournée (l'autre moitié d'une pièce au pli, le second exemplaire d'une pièce en double). Les points restent donnés dans le repère de la pièce dessinée et se retournent avec la copie. Absent : tous les exemplaires (marque symétrique). Le côté du porteur de chaque exemplaire suit PanelPlacement. Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée.
   */
  copy?: 'drawn' | 'mirrored';
}
/**
 * Contour de pose fermé, par exemple l'emplacement d'une poche plaquée.
 */
export interface OutlineMark {
  kind: 'outline';
  /**
   * Sommets du contour, dans l'ordre ; le dernier rejoint le premier.
   *
   * @minItems 3
   * @maxItems 1000
   */
  points: [Point, Point, Point, ...Point[]];
  /**
   * Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.
   */
  label?: string;
  /**
   * Exemplaire de la pièce qui porte la marque, pour une pièce au pli ou en double (quantity: 2) : drawn, la pièce telle que dessinée (la moitié dessinée d'une pièce au pli) ; mirrored, sa copie retournée (l'autre moitié d'une pièce au pli, le second exemplaire d'une pièce en double). Les points restent donnés dans le repère de la pièce dessinée et se retournent avec la copie. Absent : tous les exemplaires (marque symétrique). Le côté du porteur de chaque exemplaire suit PanelPlacement. Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée.
   */
  copy?: 'drawn' | 'mirrored';
}
/**
 * Emplacement d'un bouton.
 */
export interface ButtonMark {
  kind: 'button';
  /**
   * Centre du bouton (un point).
   *
   * @minItems 1
   * @maxItems 1
   */
  points: [Point];
  /**
   * Diamètre du bouton, en millimètres.
   */
  diameterMm?: number;
  /**
   * Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.
   */
  label?: string;
  /**
   * Exemplaire de la pièce qui porte la marque, pour une pièce au pli ou en double (quantity: 2) : drawn, la pièce telle que dessinée (la moitié dessinée d'une pièce au pli) ; mirrored, sa copie retournée (l'autre moitié d'une pièce au pli, le second exemplaire d'une pièce en double). Les points restent donnés dans le repère de la pièce dessinée et se retournent avec la copie. Absent : tous les exemplaires (marque symétrique). Le côté du porteur de chaque exemplaire suit PanelPlacement. Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée.
   */
  copy?: 'drawn' | 'mirrored';
}
/**
 * Fente à couper dans la pièce (segment), par exemple une fente d'encolure, de patte ou de poignet.
 */
export interface SlitMark {
  kind: 'slit';
  /**
   * Début et fin de la fente.
   *
   * @minItems 2
   * @maxItems 2
   */
  points: [Point, Point];
  /**
   * Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.
   */
  label?: string;
  /**
   * Exemplaire de la pièce qui porte la marque, pour une pièce au pli ou en double (quantity: 2) : drawn, la pièce telle que dessinée (la moitié dessinée d'une pièce au pli) ; mirrored, sa copie retournée (l'autre moitié d'une pièce au pli, le second exemplaire d'une pièce en double). Les points restent donnés dans le repère de la pièce dessinée et se retournent avec la copie. Absent : tous les exemplaires (marque symétrique). Le côté du porteur de chaque exemplaire suit PanelPlacement. Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée.
   */
  copy?: 'drawn' | 'mirrored';
}
/**
 * Zone fermée à orner, par exemple une zone de broderie le long de l'encolure.
 */
export interface ZoneMark {
  kind: 'zone';
  /**
   * Sommets du contour de la zone, dans l'ordre ; le dernier rejoint le premier.
   *
   * @minItems 3
   * @maxItems 1000
   */
  points: [Point, Point, Point, ...Point[]];
  /**
   * Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.
   */
  label?: string;
  /**
   * Exemplaire de la pièce qui porte la marque, pour une pièce au pli ou en double (quantity: 2) : drawn, la pièce telle que dessinée (la moitié dessinée d'une pièce au pli) ; mirrored, sa copie retournée (l'autre moitié d'une pièce au pli, le second exemplaire d'une pièce en double). Les points restent donnés dans le repère de la pièce dessinée et se retournent avec la copie. Absent : tous les exemplaires (marque symétrique). Le côté du porteur de chaque exemplaire suit PanelPlacement. Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée.
   */
  copy?: 'drawn' | 'mirrored';
}
/**
 * Ligne de pli intérieure (segment) : la pièce se plie sur cette ligne (poignet, rabat de poche, patte).
 */
export interface FoldMark {
  kind: 'fold';
  /**
   * Extrémités de la ligne de pli.
   *
   * @minItems 2
   * @maxItems 2
   */
  points: [Point, Point];
  /**
   * Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.
   */
  label?: string;
  /**
   * Exemplaire de la pièce qui porte la marque, pour une pièce au pli ou en double (quantity: 2) : drawn, la pièce telle que dessinée (la moitié dessinée d'une pièce au pli) ; mirrored, sa copie retournée (l'autre moitié d'une pièce au pli, le second exemplaire d'une pièce en double). Les points restent donnés dans le repère de la pièce dessinée et se retournent avec la copie. Absent : tous les exemplaires (marque symétrique). Le côté du porteur de chaque exemplaire suit PanelPlacement. Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée.
   */
  copy?: 'drawn' | 'mirrored';
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
 * Matière d'une pièce ou d'une marque (tissu principal, tissu de contraste, galon…), reprise du document de modèle (ADR 0020).
 */
export interface Material {
  /**
   * Nom affiché sur le plan de coupe, la liste de coupe et les fournitures (ex. Coton blanc). Texte d'une ligne, jamais de donnée de client.
   */
  name: string;
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
