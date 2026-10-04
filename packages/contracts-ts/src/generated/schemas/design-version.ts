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
