// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Entrée du catalogue 1 (ADR 0019) : brian, bloc homme (tunique, chemise) ; teagan, tee-shirt ; titan, pantalon ; sandy, jupe cercle ; bella, corsage ; straight-skirt, jupe droite écrite sur l'API de FreeSewing. Le rejeu refuse une entrée que son catalogue n'a pas encore. Une entrée nouvelle élargit le format (version mineure).
 */
export type BaseKey = 'brian' | 'teagan' | 'titan' | 'sandy' | 'bella' | 'straight-skirt';
/**
 * Mesures du porteur, complètes pour la base : une taille d'un tableau (SizeMeasurements) ou un jeu de mesures (CustomMeasurements). Le moteur de tracé ne déduit rien et n'appelle aucun autre moteur (ADR 0024) : le même document se rejoue à l'identique partout.
 */
export type DesignMeasurements = SizeMeasurements | CustomMeasurements;
/**
 * Taille du tableau de FreeSewing (paquet @freesewing/models, même version que la base), adulte : cisFemaleAdult, femme ; cisMaleAdult, homme ; suivi du tour de cou en cm.
 */
export type ChartSize =
  | 'cisFemaleAdult28'
  | 'cisFemaleAdult30'
  | 'cisFemaleAdult32'
  | 'cisFemaleAdult34'
  | 'cisFemaleAdult36'
  | 'cisFemaleAdult38'
  | 'cisFemaleAdult40'
  | 'cisFemaleAdult42'
  | 'cisFemaleAdult44'
  | 'cisFemaleAdult46'
  | 'cisMaleAdult32'
  | 'cisMaleAdult34'
  | 'cisMaleAdult36'
  | 'cisMaleAdult38'
  | 'cisMaleAdult40'
  | 'cisMaleAdult42'
  | 'cisMaleAdult44'
  | 'cisMaleAdult46'
  | 'cisMaleAdult48'
  | 'cisMaleAdult50';
/**
 * Genre de la matière, qui choisit son motif au dessin : plain, uni ; bogolan ; geometric, imprimé géométrique ; weave, tissage (armure visible) ; stripes, rayure ; gingham, vichy ; stripedTrim, galon rayé ; greekKeyTrim, galon à la grecque ; embroidery, broderie (fil).
 */
export type MaterialKind =
  | 'plain'
  | 'bogolan'
  | 'geometric'
  | 'weave'
  | 'stripes'
  | 'gingham'
  | 'stripedTrim'
  | 'greekKeyTrim'
  | 'embroidery';
/**
 * Couleur sRGB #rrggbb, en minuscules.
 */
export type Color = string;
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
 * Document de modèle (ADR 0020) : une base du catalogue et ses options, les mesures du porteur, une table de matières et une liste ordonnée d'opérations. Le rejouer est déterministe, à l'identique dans le navigateur et sous Node (moteur de tracé drafting, ADR 0024) : il donne la GarmentSpec et tout ce qui en découle. Entrée non sûre : le schéma borne sa taille (64 opérations, 32 points par chemin, 20 matières, textes d'une ligne de 80 caractères) et le rejeu vérifie ce qu'un schéma ne sait pas dire (docs/composants/contrats.md). Un document qui porte un jeu de mesures contient une donnée personnelle : il n'est jamais journalisé, ni envoyé à l'assistant sans consentement (ADR 0023).
 */
export interface DesignDocument {
  /**
   * Version du format. Il s'élargit en version mineure (1.1, 1.2…) quand s'ajoute une opération, une base, un repère, un paramètre ou une valeur permise ; un lecteur accepte toutes les versions mineures qu'il connaît, un producteur n'écrit la nouvelle que s'il en emploie un apport.
   */
  documentVersion: '1.0';
  base: DesignBase;
  measurements: DesignMeasurements;
  materials: DesignMaterials;
  /**
   * Opérations, dans l'ordre (64 au plus ; vide : le vêtement neutre de la base). Le rejeu applique les opérations actives par phase, puis dans l'ordre de la liste ; annuler retire ou rétablit une opération et rejoue. Chaque id est unique dans la liste : le rejeu le vérifie, le schéma ne refuse que deux opérations identiques.
   *
   * @maxItems 64
   */
  operations: DesignOperation[];
}
/**
 * Base du modèle : une entrée du catalogue, tracée par FreeSewing à la version donnée, avec ses options. Seule, elle donne le vêtement neutre : la matière main, sans découpe, bande ni motif.
 */
export interface DesignBase {
  key: BaseKey;
  /**
   * Version de FreeSewing qui trace la base (ex. 4.10.2). Le rejeu refuse une version que le moteur de tracé n'embarque pas : une montée de version de FreeSewing (ADR 0019) dit comment les documents enregistrés passent à la nouvelle.
   */
  freesewingVersion: string;
  options?: BaseOptions;
}
/**
 * Options FreeSewing de la base, par nom (ex. lengthBonus, chestEase) : pourcentage en fraction comme dans FreeSewing (0.28 pour 28 %), angle en degrés, nombre entier, booléen ou valeur d'une liste. La longueur et l'aisance générales du vêtement sont des options de la base, pas des opérations. Le rejeu refuse une option que la base n'a pas, d'un autre type ou hors de ses bornes. Absentes : options par défaut de la base.
 */
export interface BaseOptions {
  [k: string]: number | boolean | string;
}
/**
 * Taille d'un tableau de tailles : ses mesures sont complètes pour toutes les bases et ne sont celles de personne. Un document à partager ou à donner en exemple part d'une taille.
 */
export interface SizeMeasurements {
  size: ChartSize;
}
/**
 * Mesures d'une personne, complétées par le mannequin dans le studio avant l'enregistrement : le rejeu refuse un jeu auquel manque une mesure de la base (erreur typée, sans valeur de mesure). Donnée personnelle sensible.
 */
export interface CustomMeasurements {
  measurementSet: MeasurementSet;
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
 * Table des matières du document, par clé (MaterialKey de GarmentSpec, 20 au plus). main, obligatoire, est la matière principale : celle de la base et de toute pièce sans autre matière (parementures comprises). Les opérations renvoient à la table par clé, et toute clé citée y figure (vérifié par le rejeu). Le rejeu recopie la table dans GarmentSpec.materials.
 */
export interface DesignMaterials {
  main: DesignMaterial;
  [k: string]: DesignMaterial;
}
/**
 * Matière du document : nom, genre et couleurs. Le dessin technique et la planche lisent son genre et ses couleurs ; le plan de coupe et les fournitures, son nom.
 */
export interface DesignMaterial {
  /**
   * Nom affiché (ex. Coton blanc), recopié dans GarmentSpec.materials : mêmes règles que Material.name de GarmentSpec, une ligne de 80 caractères au plus, jamais de donnée de client.
   */
  name: string;
  kind: MaterialKind;
  /**
   * Couleurs de la matière, de la plus visible à la moins visible (1 à 4) : fond d'un uni, teinte dominante d'un imprimé, motif d'un galon, fil d'une broderie ; les suivantes sont les couleurs secondaires du motif, que le dessin complète au besoin d'après le genre.
   *
   * @minItems 1
   * @maxItems 4
   */
  colors: [Color] | [Color, Color] | [Color, Color, Color] | [Color, Color, Color, Color];
}
/**
 * Déformation d'ourlet du corps, devant et dos (bords hem et side) : évasement et arrondi ; le milieu ne bouge pas. Une seule active par document.
 */
export interface HemShapeOperation {
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
   */
  material?: string;
}
/**
 * Fentes de côté depuis l'ourlet, devant et dos (bords side et hem), avec un cran d'arrêt de fente. Une seule active par document.
 */
export interface SideSlitOperation {
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   *
   * Items: Point ancré, dans le repère de la pièce de l'opération, selon ses champs : bord et abscisse (EdgeXAnchor), bord et ordonnée (EdgeYAnchor), bord et fraction de sa longueur (EdgeFractionAnchor), repère et décalage (LandmarkAnchor), ou coordonnées (PointAnchor). Un point ancré à un bord ou à un repère suit la taille et les mesures ; des coordonnées dépendent de la base.
   */
  points: [
    EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor,
    EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor,
    ...(EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor)[],
  ];
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
  /**
   * Repère d'une pièce, fourni par la fiche de couture de la base : centerNeck, milieu de l'encolure ; neckShoulder, point d'encolure à l'épaule (côté du cou) ; shoulderPoint, point d'épaule ; armholePitch, repère d'emmanchure ; armholeBottom, bas d'emmanchure (haut du côté) ; centerWaist et sideWaist, taille au milieu et au côté ; centerHip et sideHip, hanches au milieu et au côté ; centerHem, ourlet au milieu ; sideHem, coin d'ourlet (bas du côté) ; sleeveTop, sommet de la tête de manche ; bicepsFront et bicepsBack, haut du dessous de bras, devant et dos ; wristFront et wristBack, bas de manche, devant et dos. Position au moment où l'opération se rejoue : une opération d'une phase antérieure peut le déplacer (l'encolure déplace centerNeck et neckShoulder). Un repère que la pièce n'a pas rend l'opération inapplicable (erreur du rejeu).
   */
  landmark:
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
   */
  material?: string;
}
/**
 * Poche plaquée sur le devant, posée par un point ancré : une pièce poche et une marque de pose s'ajoutent.
 */
export interface PocketOperation {
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
   */
  material?: string;
}
/**
 * Galon cousu en surface le long d'un chemin du devant ; son motif vient du genre de sa matière (stripedTrim, greekKeyTrim…). Le chemin est donné sur la moitié du devant d'abscisses positives ; side choisit le côté du porteur, both pose deux galons symétriques. Le rejeu mesure la longueur de galon à acheter.
 */
export interface TrimOperation {
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
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
   *
   * Items: Point ancré, dans le repère de la pièce de l'opération, selon ses champs : bord et abscisse (EdgeXAnchor), bord et ordonnée (EdgeYAnchor), bord et fraction de sa longueur (EdgeFractionAnchor), repère et décalage (LandmarkAnchor), ou coordonnées (PointAnchor). Un point ancré à un bord ou à un repère suit la taille et les mesures ; des coordonnées dépendent de la base.
   */
  points: [
    EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor,
    EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor,
    ...(EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor)[],
  ];
  /**
   * Courbe lisse qui passe par tous les points (Catmull-Rom) ; false : segments droits.
   */
  smooth?: boolean;
}
/**
 * Zone de broderie le long de l'encolure devant, et de la patte si demandé : zone décorative posée sur le patron. Une seule active par document.
 */
export interface EmbroideryOperation {
  /**
   * Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).
   */
  id: string;
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
   * Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.
   */
  material: string;
}
