/** Point du plan, en millimètres. Repère de FreeSewing : x vers la droite, y vers le bas. */
export interface PointMm {
  readonly xMm: number;
  readonly yMm: number;
}

/** Déplacement du crayon : début du contour. */
export interface MoveOp {
  readonly type: 'move';
  readonly to: PointMm;
}

/** Ligne droite jusqu'à `to`. */
export interface LineOp {
  readonly type: 'line';
  readonly to: PointMm;
}

/** Courbe de Bézier cubique jusqu'à `to`, de points de contrôle `cp1` et `cp2`. */
export interface CurveOp {
  readonly type: 'curve';
  readonly cp1: PointMm;
  readonly cp2: PointMm;
  readonly to: PointMm;
}

/** Retour en ligne droite au point de départ. */
export interface CloseOp {
  readonly type: 'close';
}

/** Opération qui trace un segment. */
export type DrawOp = LineOp | CurveOp | CloseOp;

/**
 * Opération du tracé d'un contour, telle que FreeSewing la décrit. Les coordonnées sont brutes (non arrondies) :
 * l'arrondi se fait en sortie seulement.
 */
export type PathOp = MoveOp | DrawOp;

/** Pièce tracée par FreeSewing, lue sans interprétation : entrée du cœur. */
export interface TracedPart {
  /** Nom de la pièce chez FreeSewing, ex. `brian.front`. */
  readonly name: string;
  /** Pièce masquée par le modèle (squelette, pièce désactivée par une option). */
  readonly hidden: boolean;
  /** Tous les points nommés de la pièce, y compris les points temporaires (préfixe `_`). */
  readonly points: Readonly<Record<string, PointMm>>;
  /** Opérations du chemin `paths.seam` (contour de couture) ; absent si la pièce n'en a pas. */
  readonly seam: readonly PathOp[] | undefined;
}

/** Segment d'un contour : une ligne ou une courbe de Bézier cubique entre deux sommets. */
export interface Segment {
  readonly kind: 'line' | 'curve';
  /** Indice du sommet de départ. */
  readonly from: number;
  /** Indice du sommet d'arrivée (le dernier segment d'un contour fermé revient au sommet 0). */
  readonly to: number;
  readonly lengthMm: number;
  /** Points de contrôle d'une courbe. */
  readonly cp1?: PointMm;
  readonly cp2?: PointMm;
}

/** Contour fermé d'une pièce, avant nommage et arrondi. */
export interface Contour {
  readonly vertices: readonly PointMm[];
  readonly segments: readonly Segment[];
}

/** Rôles sémantiques des bords : les mêmes que `EdgeSemanticRole` de GarmentSpec 1.1 (vérifié par un test de types). */
export const SEMANTIC_ROLES = [
  'neckline',
  'shoulder',
  'armhole',
  'side',
  'hem',
  'centerFront',
  'centerBack',
  'sleeveCap',
  'underarm',
  'sleeveHem',
  'waist',
  'inseam',
  'outseam',
  'rise',
  'dart',
  'styleLine',
] as const;

export type SemanticRole = (typeof SEMANTIC_ROLES)[number];

/** Sommet d'un contour sorti du moteur : sa position et les noms de points FreeSewing qui s'y trouvent. */
export interface NamedVertex extends PointMm {
  /** Noms des points publics de la pièce à moins de 0,01 mm (ex. `armholePitch`) ; jamais vide pour Brian. */
  readonly names: readonly string[];
}

/** Contour sorti du moteur : sommets nommés et segments, coordonnées et longueurs arrondies à 0,001 mm. */
export interface DraftedContour {
  readonly vertices: readonly NamedVertex[];
  readonly segments: readonly Segment[];
}

/** Bord d'une pièce : une suite de segments du contour, de `fromPoint` à `toPoint`, avec son rôle. */
export interface DraftedEdge {
  /** Identifiant du bord dans la pièce (fiche de couture), ex. `side`. */
  readonly id: string;
  readonly semanticRole: SemanticRole;
  /** Nom du point FreeSewing où le bord commence, puis où il finit. */
  readonly fromPoint: string;
  readonly toPoint: string;
  /** Sommets du contour où le bord commence et finit. */
  readonly fromVertex: number;
  readonly toVertex: number;
  /** Indices des segments du contour, dans l'ordre du contour. */
  readonly segments: readonly number[];
  readonly lengthMm: number;
}

/** Pièce tracée et découpée en bords nommés par la fiche de couture. */
export interface DraftedPart {
  /** Nom de la pièce chez FreeSewing, ex. `brian.front`. */
  readonly part: string;
  /** Identifiant de la pièce dans la fiche, ex. `front`. */
  readonly id: string;
  readonly contour: DraftedContour;
  /** Bords de la fiche, dans l'ordre du contour. */
  readonly edges: readonly DraftedEdge[];
  /** Points publics de la pièce (sans les points temporaires `_…`), arrondis à 0,001 mm. */
  readonly points: Readonly<Record<string, PointMm>>;
}
