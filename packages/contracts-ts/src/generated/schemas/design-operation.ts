// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Opération d'un document de modèle (ADR 0020), choisie par op. Une opération est générique : elle ne lit que des rôles de bords (EdgeSemanticRole de GarmentSpec) et des repères de pièce, jamais un nom de vêtement. Champs communs : id (unique dans le document), op et enabled. Longueurs en mm ; coordonnées dans le repère de la pièce (voir PointAnchor : y vers le bas, à l'inverse de GarmentSpec). Un paramètre absent prend sa valeur par défaut (default) : elle fait partie du contrat et ne change pas, sinon les documents enregistrés se rejoueraient autrement. Ces schémas et leurs descriptions sont aussi les outils de l'assistant (ADR 0023). Phases du rejeu, règles que le schéma ne peut pas dire et tracés des préréglages : docs/composants/contrats.md.
 */
export type DesignOperation =
  | HemShapeOperation
  | NecklineOperation
  | SleeveLengthOperation
  | CuffOperation
  | SideSlitOperation
  | BandOperation
  | StyleLineOperation
  | NeckSlitOperation
  | PlacketOperation
  | PocketOperation
  | TrimOperation
  | EmbroideryOperation;
/**
 * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
 */
export type OperationId = string;
/**
 * Point ancré, dans le repère de la pièce de l'opération, selon ses champs : bord et abscisse (EdgeXAnchor), bord et ordonnée (EdgeYAnchor), bord et fraction de sa longueur (EdgeFractionAnchor), repère et décalage (LandmarkAnchor), ou coordonnées (PointAnchor). Un point ancré à un bord ou à un repère suit la taille et les mesures ; des coordonnées dépendent de la base.
 */
export type AnchorPoint =
  EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor;
/**
 * Repère d'une pièce, fourni par la fiche de couture de la base : centerNeck, milieu de l'encolure ; neckShoulder, point d'encolure à l'épaule (côté du cou) ; shoulderPoint, point d'épaule ; armholePitch, repère d'emmanchure ; armholeBottom, bas d'emmanchure (haut du côté) ; centerWaist et sideWaist, taille au milieu et au côté ; centerHip et sideHip, hanches au milieu et au côté ; centerHem, ourlet au milieu ; sideHem, coin d'ourlet (bas du côté) ; sleeveTop, sommet de la tête de manche ; bicepsFront et bicepsBack, haut du dessous de bras, devant et dos ; wristFront et wristBack, bas de manche, devant et dos. Position au moment où l'opération se rejoue : une opération d'une phase antérieure peut le déplacer (l'encolure déplace centerNeck et neckShoulder). Un repère que la pièce n'a pas rend l'opération inapplicable (erreur du rejeu).
 */
export type PieceLandmark =
  | 'centerNeck'
  | 'neckShoulder'
  | 'shoulderPoint'
  | 'armholePitch'
  | 'armholeBottom'
  | 'centerWaist'
  | 'sideWaist'
  | 'centerHip'
  | 'sideHip'
  | 'centerHem'
  | 'sideHem'
  | 'sleeveTop'
  | 'bicepsFront'
  | 'bicepsBack'
  | 'wristFront'
  | 'wristBack';

/**
 * Déformation d'ourlet du corps, devant et dos (bords hem et side) : évasement et arrondi ; le milieu ne bouge pas. Une seule active par document.
 */
export interface HemShapeOperation {
  id: OperationId;
  /**
   * Déformation d'ourlet.
   */
  op: 'hemShape';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Évasement, en mm : le coin d'ourlet s'écarte de cette longueur vers l'extérieur, le côté s'évase progressivement depuis sa mi-hauteur et l'ourlet suit.
   */
  flareMm?: number;
  /**
   * Arrondi, en mm : l'ourlet remonte de cette hauteur au coin, en courbe depuis le milieu (carré de la distance au milieu) ; les points du côté sous le nouveau coin disparaissent.
   */
  curveMm?: number;
}
/**
 * Encolure ronde ou en V, devant et dos (bords neckline et shoulder) : le point d'encolure recule le long de l'épaule, le milieu devant et le milieu dos se creusent, et des parementures d'encolure devant et dos s'ajoutent. Une seule active par document.
 */
export interface NecklineOperation {
  id: OperationId;
  /**
   * Encolure.
   */
  op: 'neckline';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Forme de l'encolure devant : round, ronde ; v, en V (le dos reste rond).
   */
  shape?: 'round' | 'v';
  /**
   * Creusement du milieu devant sous l'encolure de la base, en mm (forme round ; sans effet en v).
   */
  lowerMm?: number;
  /**
   * Élargissement, en mm : le point d'encolure recule de cette longueur le long de l'épaule, devant et dos.
   */
  widenMm?: number;
  /**
   * Profondeur de la pointe du V sous le haut de la pièce (y = 0, niveau du point d'encolure de la base), en mm (forme v ; sans effet en round).
   */
  vDepthMm?: number;
  /**
   * Creusement du milieu dos sous l'encolure de la base, en mm.
   */
  backLowerMm?: number;
  /**
   * Largeur des parementures d'encolure, mesurée depuis l'encolure, en mm.
   */
  facingWidthMm?: number;
}
/**
 * Longueur de manche (bords underarm et sleeveHem) : la manche est coupée à cette longueur totale ; une longueur supérieure à celle de la manche de la base la laisse entière (l'allonger passe par les options de la base). Une seule active par document.
 */
export interface SleeveLengthOperation {
  id: OperationId;
  /**
   * Longueur de manche.
   */
  op: 'sleeveLength';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Longueur totale de la manche, du sommet de la tête au bas de manche, en mm.
   */
  lengthMm: number;
}
/**
 * Poignet, droit ou mousquetaire (bord sleeveHem ; mesure : tour de poignet) : la manche se raccourcit de la hauteur du poignet moins 12 mm de montage, et s'ajoutent le poignet, une fente de poignet, sa patte et sa sous-patte. Un bas de manche n'a qu'une finition, poignet ou bande ; un seul poignet actif par document.
 */
export interface CuffOperation {
  id: OperationId;
  /**
   * Poignet.
   */
  op: 'cuff';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Hauteur du poignet fini, en mm.
   */
  heightMm?: number;
  /**
   * barrel : poignet droit, boutonné ; french : poignet mousquetaire, replié, pour boutons de manchette.
   */
  style?: 'barrel' | 'french';
  /**
   * Aisance du poignet autour du tour de poignet, en mm.
   */
  easeMm?: number;
  /**
   * Croisure du poignet (recouvrement du boutonnage), en mm.
   */
  overlapMm?: number;
  /**
   * Matière du poignet et des pattes de fente : clé de la table materials du document.
   */
  material?: string;
}
/**
 * Fentes de côté depuis l'ourlet, devant et dos (bords side et hem), avec un cran d'arrêt de fente. Une seule active par document.
 */
export interface SideSlitOperation {
  id: OperationId;
  /**
   * Fentes de côté.
   */
  op: 'sideSlit';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Hauteur des fentes au-dessus de l'ourlet, en mm.
   */
  heightMm?: number;
}
/**
 * Bande rapportée parallèle à un bord : une découpe à heightMm du bord crée une bande dans sa propre matière. Bas du corps (hem) : une bande devant et une bande dos ; bas de manche (sleeveHem) : une bande de manche. Une seule bande active par bord ; un bas de manche n'a qu'une finition, poignet ou bande.
 */
export interface BandOperation {
  id: OperationId;
  /**
   * Bande rapportée.
   */
  op: 'band';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Bord longé (rôle de GarmentSpec) : hem, bas du corps ; sleeveHem, bas de manche.
   */
  edge: 'hem' | 'sleeveHem';
  /**
   * Hauteur de la bande, mesurée depuis le bord, en mm.
   */
  heightMm: number;
  /**
   * Matière de la bande : clé de la table materials du document.
   */
  material: string;
  /**
   * Nom de la bande sur les patrons (ex. Bande d'ourlet) ; une bande d'ourlet donne une pièce devant et une pièce dos, que le rejeu distingue.
   */
  name: string;
}
/**
 * Découpe : coupe une pièce le long d'une ligne, prédéfinie ou libre (chemin ancré aux bords qu'il croise) ; la partie retenue devient une région avec son nom et sa matière, l'autre garde les siens. Sur une pièce coupée au pli, la découpe est symétrique, et un chemin qui traverse le milieu est ramené à sa plus longue portion d'un côté. La couture créée a le rôle styleLine. Plusieurs découpes se rejouent dans l'ordre du document : chacune coupe la région qu'elle traverse, et une ligne qui ne traverse aucune région est refusée par le rejeu.
 */
export interface StyleLineOperation {
  id: OperationId;
  /**
   * Découpe.
   */
  op: 'styleLine';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Pièce coupée.
   */
  piece?: 'front' | 'back' | 'sleeve';
  /**
   * Tracé de la découpe : préréglage partant de l'épaule (StyleLinePreset), empiècement (YokePreset) ou chemin libre (Path).
   */
  line: StyleLinePreset | YokePreset | Path;
  /**
   * Prolongement d'un chemin libre à ses deux bouts, dans le sens de ses extrémités, en mm, pour qu'il croise franchement le contour (un préréglage est prolongé de 15 mm).
   */
  extendMm?: number;
  region: StyleLineRegion;
  /**
   * Surpiqûre le long de la découpe, montrée sur le dessin technique.
   */
  topstitch?: boolean;
}
/**
 * Découpe prédéfinie qui part de l'épaule et descend au milieu (plastron) : u, en U lissé ; pointed, en pointe ; square, carrée. Points du tracé : docs/composants/contrats.md.
 */
export interface StyleLinePreset {
  /**
   * Forme : u, pointed ou square.
   */
  preset: 'u' | 'pointed' | 'square';
  /**
   * Profondeur au milieu, sous le haut de la pièce (y = 0), en mm.
   */
  depthMm: number;
  /**
   * Départ sur l'épaule : abscisse du point de l'épaule où commence la découpe, en mm (ramenée à la plage de l'épaule).
   */
  shoulderXMm: number;
}
/**
 * Empiècement : découpe horizontale, du milieu au côté, à la profondeur depthMm.
 */
export interface YokePreset {
  /**
   * Empiècement.
   */
  preset: 'yoke';
  /**
   * Profondeur de la découpe sous le haut de la pièce (y = 0), en mm.
   */
  depthMm: number;
}
/**
 * Chemin ouvert, par des points ancrés dans l'ordre. Ses points sont des poignées : les déplacer modifie l'opération elle-même.
 */
export interface Path {
  /**
   * Points du chemin, dans l'ordre (2 à 32).
   *
   * @minItems 2
   * @maxItems 32
   */
  points: [AnchorPoint, AnchorPoint, ...AnchorPoint[]];
  /**
   * Courbe lisse qui passe par tous les points (Catmull-Rom) ; false : segments droits.
   */
  smooth?: boolean;
}
/**
 * Point du bord edge de la pièce à l'abscisse xMm : le premier dans le sens du bord (voir EdgeFractionAnchor). Une abscisse hors de la plage du bord est ramenée à son extrémité la plus proche.
 */
export interface EdgeXAnchor {
  /**
   * Rôle du bord (EdgeSemanticRole de GarmentSpec). Une manche a deux dessous de bras (underarm) : celui du devant (x positif) est pris.
   */
  edge:
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
  /**
   * Abscisse du point, en mm, dans le repère de la pièce.
   */
  xMm: number;
}
/**
 * Point du bord edge de la pièce à l'ordonnée yMm : le premier dans le sens du bord (voir EdgeFractionAnchor). Une ordonnée hors de la plage du bord est ramenée à son extrémité la plus proche.
 */
export interface EdgeYAnchor {
  /**
   * Rôle du bord (EdgeSemanticRole de GarmentSpec). Une manche a deux dessous de bras (underarm) : celui du devant (x positif) est pris.
   */
  edge:
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
  /**
   * Ordonnée du point, en mm, dans le repère de la pièce (positive vers le bas).
   */
  yMm: number;
}
/**
 * Point du bord edge à une fraction de sa longueur. Sens des bords, de 0 à 1 : du milieu vers le côté pour neckline, shoulder, hem et waist ; de haut en bas pour armhole, side, centerFront, centerBack, underarm, inseam, outseam, rise et dart ; du dos vers le devant pour sleeveCap et sleeveHem ; du début vers la fin du chemin qui l'a tracé pour styleLine.
 */
export interface EdgeFractionAnchor {
  /**
   * Rôle du bord (EdgeSemanticRole de GarmentSpec). Une manche a deux dessous de bras (underarm) : celui du devant (x positif) est pris.
   */
  edge:
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
  /**
   * Fraction de la longueur du bord, sans unité : 0 à son début, 1 à sa fin, dans le sens du bord.
   */
  fraction: number;
}
/**
 * Repère de la pièce, décalé : abscisse = xFraction × abscisse du repère + dxMm ; ordonnée = ordonnée du repère + dyMm.
 */
export interface LandmarkAnchor {
  landmark: PieceLandmark;
  /**
   * Fraction de l'abscisse du repère, sans unité, avant le décalage dxMm : 0 sur l'axe de la pièce, 1 à l'aplomb du repère. Absent : 1.
   */
  xFraction?: number;
  /**
   * Décalage horizontal, en mm, positif vers le côté (vers le devant sur une manche). Absent : 0.
   */
  dxMm?: number;
  /**
   * Décalage vertical, en mm, positif vers le bas. Absent : 0.
   */
  dyMm?: number;
}
/**
 * Coordonnées dans le repère de la pièce, en mm : x = 0 sur l'axe de la pièce fixé par sa fiche de couture (milieu devant ou dos, axe de la manche), positif vers le côté (vers le devant sur une manche) ; y = 0 au point le plus haut de la pièce de base, avant toute opération, positif vers le bas (à l'inverse de GarmentSpec). Elles ne suivent ni la taille ni les mesures : préférer un bord ou un repère.
 */
export interface PointAnchor {
  /**
   * Abscisse, en mm.
   */
  xMm: number;
  /**
   * Ordonnée, en mm, positive vers le bas.
   */
  yMm: number;
}
/**
 * Partie retenue de la pièce coupée : elle prend ce nom et cette matière.
 */
export interface StyleLineRegion {
  /**
   * Nom de la région sur les patrons (ex. Plastron, Empiècement devant).
   */
  name: string;
  /**
   * Matière de la région : clé de la table materials du document.
   */
  material: string;
  /**
   * Point ancré, dans le repère de la pièce de l'opération, selon ses champs : bord et abscisse (EdgeXAnchor), bord et ordonnée (EdgeYAnchor), bord et fraction de sa longueur (EdgeFractionAnchor), repère et décalage (LandmarkAnchor), ou coordonnées (PointAnchor). Un point ancré à un bord ou à un repère suit la taille et les mesures ; des coordonnées dépendent de la base.
   */
  insidePoint?: EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor;
}
/**
 * Fente d'encolure au milieu devant, depuis l'encolure, avec sa parementure. Une seule active par document.
 */
export interface NeckSlitOperation {
  id: OperationId;
  /**
   * Fente d'encolure.
   */
  op: 'neckSlit';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Longueur de la fente sous le milieu de l'encolure, en mm.
   */
  lengthMm?: number;
  /**
   * Largeur de la parementure de fente, en mm.
   */
  facingWidthMm?: number;
}
/**
 * Patte de boutonnage au milieu devant, depuis l'encolure : fente, pattes dessus et dessous entoilées, boutons répartis sur la longueur. Une seule active par document.
 */
export interface PlacketOperation {
  id: OperationId;
  /**
   * Patte de boutonnage.
   */
  op: 'placket';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Longueur de la patte sous le milieu de l'encolure, en mm.
   */
  lengthMm: number;
  /**
   * Largeur de la patte finie, en mm.
   */
  widthMm?: number;
  /**
   * Nombre de boutons, répartis sur la longueur de la patte.
   */
  buttonCount?: number;
  /**
   * Diamètre des boutons, en mm.
   */
  buttonDiameterMm?: number;
  /**
   * Matière des pattes : clé de la table materials du document.
   */
  material?: string;
}
/**
 * Poche plaquée sur le devant, posée par un point ancré : une pièce poche et une marque de pose s'ajoutent.
 */
export interface PocketOperation {
  id: OperationId;
  /**
   * Poche plaquée.
   */
  op: 'pocket';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Côté du porteur où se pose la poche : left, sa gauche ; right, sa droite.
   */
  side?: 'left' | 'right';
  /**
   * Point ancré, dans le repère de la pièce de l'opération, selon ses champs : bord et abscisse (EdgeXAnchor), bord et ordonnée (EdgeYAnchor), bord et fraction de sa longueur (EdgeFractionAnchor), repère et décalage (LandmarkAnchor), ou coordonnées (PointAnchor). Un point ancré à un bord ou à un repère suit la taille et les mesures ; des coordonnées dépendent de la base.
   */
  position?: EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor;
  /**
   * Largeur de la poche finie, en mm.
   */
  widthMm?: number;
  /**
   * Hauteur de la poche finie, en mm.
   */
  heightMm?: number;
  /**
   * straight : rectangulaire ; pointed : fond en pointe.
   */
  shape?: 'straight' | 'pointed';
  /**
   * Matière de la poche : clé de la table materials du document.
   */
  material?: string;
}
/**
 * Galon cousu en surface le long d'un chemin du devant ; son motif vient du genre de sa matière (stripedTrim, greekKeyTrim…). Le chemin est donné sur la moitié du devant d'abscisses positives ; side choisit le côté du porteur, both pose deux galons symétriques. Le rejeu mesure la longueur de galon à acheter.
 */
export interface TrimOperation {
  id: OperationId;
  /**
   * Galon.
   */
  op: 'trim';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Côté du porteur : left, sa gauche ; right, sa droite ; both, les deux, symétriques.
   */
  side?: 'left' | 'right' | 'both';
  path: Path1;
  /**
   * Largeur du galon, en mm ; le chemin en est l'axe.
   */
  widthMm?: number;
  /**
   * Matière du galon : clé de la table materials du document.
   */
  material: string;
  /**
   * Nom du galon sur les patrons et dans les fournitures : une ligne, jamais de donnée de client. Absent : le nom de sa matière.
   */
  name?: string;
}
/**
 * Chemin ouvert, par des points ancrés dans l'ordre. Ses points sont des poignées : les déplacer modifie l'opération elle-même.
 */
export interface Path1 {
  /**
   * Points du chemin, dans l'ordre (2 à 32).
   *
   * @minItems 2
   * @maxItems 32
   */
  points: [AnchorPoint, AnchorPoint, ...AnchorPoint[]];
  /**
   * Courbe lisse qui passe par tous les points (Catmull-Rom) ; false : segments droits.
   */
  smooth?: boolean;
}
/**
 * Zone de broderie le long de l'encolure devant, et de la patte si demandé : zone décorative posée sur le patron. Une seule active par document.
 */
export interface EmbroideryOperation {
  id: OperationId;
  /**
   * Broderie.
   */
  op: 'embroidery';
  /**
   * Opération active ; false : masquée, gardée dans le document mais non rejouée.
   */
  enabled?: boolean;
  /**
   * Largeur de la zone de broderie, en mm.
   */
  widthMm?: number;
  /**
   * Motif brodé : leaves, feuilles alternées sur une tige.
   */
  motif?: 'leaves';
  /**
   * La zone longe aussi la patte de boutonnage, s'il y en a une.
   */
  withPlacket?: boolean;
  /**
   * Fil de la broderie : clé de la table materials du document (en général de genre embroidery).
   */
  material: string;
}
