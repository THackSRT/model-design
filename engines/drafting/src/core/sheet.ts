import type { SemanticRole } from './types.js';

/** Rôles structurels d'un bord, ceux de `Edge.role` de GarmentSpec (vérifié par un test de types) : comment il se coupe. */
export const EDGE_ROLES = ['seam', 'fold', 'hem', 'waistline', 'opening'] as const;

export type EdgeRole = (typeof EDGE_ROLES)[number];

/**
 * Bord de la fiche de couture : une plage de points nommés sur le contour de couture, avec son rôle. Les points sont
 * ceux de FreeSewing ; le bord va de `from` à `to` dans le sens du contour (`paths.seam`).
 */
export interface EdgeSheet {
  /** Identifiant du bord dans sa pièce, ex. `side` ; unique dans la pièce (deux bords peuvent avoir le même rôle). */
  readonly id: string;
  readonly semanticRole: SemanticRole;
  /**
   * Rôle structurel du bord dans la GarmentSpec. Absent : déduit du rôle sémantique (`structuralRoleOf`) ; à écrire pour
   * le bord de pli d'une pièce coupée au pli (`fold`).
   */
  readonly role?: EdgeRole;
  /** Nom du point où le bord commence. */
  readonly from: string;
  /** Nom du point où le bord finit. */
  readonly to: string;
  /**
   * Points attendus à l'intérieur du bord. Contrôle : un de ces points qui est un sommet du contour doit se trouver
   * sur ce bord ; un point qui n'est pas un sommet (option qui le retire) n'est pas une erreur.
   */
  readonly via?: readonly string[];
}

/** Rôle structurel d'un bord sans `role` : ourlet pour `hem` et `sleeveHem`, bord libre pour l'encolure, taille, sinon couture. */
export function structuralRoleOf(edge: EdgeSheet): EdgeRole {
  if (edge.role !== undefined) return edge.role;
  switch (edge.semanticRole) {
    case 'hem':
    case 'sleeveHem':
      return 'hem';
    case 'neckline':
      return 'opening';
    case 'waist':
      return 'waistline';
    default:
      return 'seam';
  }
}

/**
 * Repère d'une pièce, que la fiche fixe par deux points nommés : l'axe de la pièce (milieu devant ou dos, axe de la
 * manche) est la verticale de `axis`, x = 0 ; le haut de la pièce de base est l'horizontale de `top`, y = 0. Le contour,
 * les points et les bords sortent dans ce repère, y vers le bas ; la GarmentSpec n'en change que le sens de y.
 */
export interface FrameSheet {
  /** Nom d'un point de l'axe de la pièce : son abscisse devient 0. */
  readonly axis: string;
  /** Nom du point le plus haut de la pièce de base : son ordonnée devient 0. */
  readonly top: string;
}

/** Partie du corps autour de laquelle une pièce s'enroule (`PanelPlacement.zone`). */
export type Zone = 'torso' | 'leg' | 'arm';
/** Côté du porteur où va la pièce telle que dessinée (`PanelPlacement.bodySide`). */
export type BodySide = 'left' | 'right' | 'center';
/** Face du corps que regarde l'endroit de la pièce (`PanelPlacement.facing`). */
export type Facing = 'front' | 'back' | 'outer';
/** Repère de hauteur du corps ajusté (`PanelPlacement.anchor.landmark`). */
export type Landmark =
  'neck' | 'shoulder' | 'waist' | 'hip' | 'crotch' | 'knee' | 'ankle' | 'wrist';

/**
 * Pose d'une pièce autour du corps (`PanelPlacement`). Le drapé suit, pour poser une pièce du tronc ou d'une jambe, le
 * bord du contour le plus proche du point d'ancrage, qu'il met à la hauteur de `landmark` plus le décalage : le point
 * d'ancrage doit donc être sur le bord qui porte la pièce (l'ourlet d'une tunique, la taille d'une jupe), sur l'axe.
 * `levelPoint` dit quel point de la pièce est au repère : la fiche écrit « la taille de la pièce est à la taille du
 * corps » et la conversion en tire le décalage de l'ancrage, des hauteurs de la pièce.
 */
export interface PlacementSheet {
  readonly zone: Zone;
  readonly bodySide: BodySide;
  readonly facing: Facing;
  readonly landmark: Landmark;
  /** Nom du point de l'axe posé sur la ligne médiane de la face (`anchor.point`). Absent : l'origine du repère de la pièce. */
  readonly anchorPoint?: string;
  /**
   * Nom du point de la pièce qui est à la hauteur de `landmark` plus `offsetMm`. Absent : le point d'ancrage. Le décalage
   * du contrat (`anchor.offsetMm`) est `offsetMm` plus la hauteur du point d'ancrage au-dessus de celui-ci, borné à ±
   * 500 mm (ses limites) : une pièce qui descend plus bas sort de la plage et se pose un peu trop haut.
   */
  readonly levelPoint?: string;
  /** Décalage vertical du point de niveau depuis le repère, en mm, positif vers le haut. */
  readonly offsetMm: number;
  readonly clearanceMm: number;
}

/**
 * Droit fil : une verticale parallèle à l'axe de la pièce, donnée en fractions de sa boîte (sommets et points de
 * contrôle). `xFraction` : abscisse en part de la largeur côté positif (0 : sur l'axe). `lowFraction` et `highFraction` :
 * extrémités basse et haute, en part de la hauteur depuis le bas de la pièce.
 */
export interface GrainSheet {
  readonly xFraction: number;
  readonly lowFraction: number;
  readonly highFraction: number;
}

/**
 * Cran déclaré sur un bord, au sommet qui porte un point nommé : à `at`, le long du bord `edge`. Il se reporte, par
 * fraction de la longueur de la couture, sur le bord que la couture lui apparie (le cran d'une emmanchure donne celui
 * de la tête de manche, embu compris).
 */
export interface NotchSheet {
  /** Identifiant du bord de la pièce. */
  readonly edge: string;
  /** Nom du point FreeSewing, sommet du bord, où se pose le cran. */
  readonly at: string;
  /** Cran simple (défaut), double (dos, par convention) ou triple. */
  readonly count?: 1 | 2 | 3;
}

/** Ce que la GarmentSpec retient d'une pièce : son nom, sa coupe, sa pose, son droit fil, ses crans. */
export interface PanelSheet {
  /** Nom affiché de la pièce (`Panel.name`), ex. « Devant ». */
  readonly name: string;
  /** Nombre de pièces à couper. */
  readonly quantity: number;
  /** Coupée au pli : la fiche déclare alors un bord de rôle `fold`, sur l'axe de la pièce. */
  readonly cutOnFold: boolean;
  readonly placement: PlacementSheet;
  readonly grain?: GrainSheet;
  readonly notches?: readonly NotchSheet[];
}

/** Fiche de couture d'une pièce : ses bords, dans l'ordre du contour, qui le couvrent exactement une fois. */
export interface PartSheet {
  /** Nom de la pièce chez FreeSewing, ex. `brian.front`. */
  readonly part: string;
  /** Identifiant de la pièce dans le modèle, ex. `front`. */
  readonly id: string;
  /** Repère de la pièce. Absent : celui de FreeSewing. */
  readonly frame?: FrameSheet;
  readonly panel: PanelSheet;
  readonly edges: readonly EdgeSheet[];
}

/** Un bord d'une couture : `part` est l'identifiant de la pièce, `edge` celui du bord ; `reversed` le parcourt à l'envers. */
export interface SeamEndSheet {
  readonly part: string;
  readonly edge: string;
  readonly reversed?: boolean;
}

/**
 * Embu déclaré d'une couture (a plus long que b). Jamais déduit des longueurs : `mm` est l'embu lui-même ; `store` est
 * la clé du magasin de FreeSewing qui donne la longueur visée pour a, l'embu étant cette longueur moins celle de b.
 * Dans les deux cas le tracé est rejeté si la longueur de a s'écarte de l'attendue de plus que `toleranceMm`. La
 * GarmentSpec n'écrit `easeMm` (l'écart mesuré de chaque paire de morceaux) que pour un embu de 0,5 mm au moins ; en
 * dessous, les deux bords sont dits de même longueur et l'écart n'est qu'une tolérance.
 */
export type EaseSheet = { readonly mm: number } | { readonly store: string };

/**
 * Couture : deux parcours de bords cousus l'un à l'autre. Chaque pièce est coupée pour que la couture relie deux bords
 * droits ou courbes (le contrat n'en admet pas d'autres) : voir `pairWalks`.
 */
export interface SeamSheet {
  /** Identifiant de la couture ; `<id>-<n>` pour chacune des coutures issues de sa découpe. */
  readonly id: string;
  readonly a: readonly SeamEndSheet[];
  readonly b: readonly SeamEndSheet[];
  /**
   * `same` : le début du parcours de a se coud au début de celui de b, `opposite` : à sa fin. Le sens de chaque bord ne
   * change pas pour autant : le contrat veut deux bords en sens opposés une fois les pièces posées, ce que le placement
   * (pli, copie en miroir) donne.
   */
  readonly align: 'same' | 'opposite';
  /** Embu déclaré. Absent : aucun, a et b ont la même longueur. */
  readonly ease?: EaseSheet;
  /** Écart toléré, en mm, entre la longueur de a et celle que la fiche attend (b plus l'embu déclaré). */
  readonly toleranceMm: number;
}

/**
 * Fiche de couture d'un modèle : une donnée par modèle, sans code. Elle dit où sont les bords du contour de chaque
 * pièce ; la sémantique (rôles, coutures, embu, placement, crans) vient d'elle, jamais de FreeSewing.
 */
export interface ModelSheet {
  /** Type de vêtement de la GarmentSpec (`garment.type`). */
  readonly garmentType: string;
  readonly parts: readonly PartSheet[];
  readonly seams: readonly SeamSheet[];
}

/** Clés du magasin de FreeSewing que la fiche déclare : leurs valeurs accompagnent le tracé (`DraftResult.values`). */
export function storeKeysOf(sheet: ModelSheet): string[] {
  const keys = sheet.seams.flatMap((seam) =>
    seam.ease !== undefined && 'store' in seam.ease ? [seam.ease.store] : [],
  );
  return [...new Set(keys)];
}
