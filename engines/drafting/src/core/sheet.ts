import type { SemanticRole } from './types.js';

/**
 * Bord de la fiche de couture : une plage de points nommés sur le contour de couture, avec son rôle. Les points sont
 * ceux de FreeSewing ; le bord va de `from` à `to` dans le sens du contour (`paths.seam`).
 */
export interface EdgeSheet {
  /** Identifiant du bord dans sa pièce, ex. `side` ; unique dans la pièce (deux bords peuvent avoir le même rôle). */
  readonly id: string;
  readonly semanticRole: SemanticRole;
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

/** Fiche de couture d'une pièce : ses bords, dans l'ordre du contour, qui le couvrent exactement une fois. */
export interface PartSheet {
  /** Nom de la pièce chez FreeSewing, ex. `brian.front`. */
  readonly part: string;
  /** Identifiant de la pièce dans le modèle, ex. `front`. */
  readonly id: string;
  readonly edges: readonly EdgeSheet[];
}

/**
 * Fiche de couture d'un modèle : une donnée par modèle, sans code. Elle dit où sont les bords du contour de chaque
 * pièce ; la sémantique (rôles, coutures, embu, placement) vient d'elle, jamais de FreeSewing.
 */
export interface ModelSheet {
  readonly parts: readonly PartSheet[];
}
