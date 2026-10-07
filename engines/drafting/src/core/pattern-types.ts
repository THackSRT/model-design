import type { Piece } from './pieces.js';
import type { EdgeRole, EdgeSheet, PartSheet, PlacementSheet } from './sheet.js';
import type { DraftedPart, PointMm, SemanticRole } from './types.js';

/**
 * Bord d'une pièce de patron en cours d'assemblage : ses pièces dans le sens du contour (une droite ou une courbe
 * chacune), que les coutures remplacent par des morceaux quand elles le coupent.
 */
export interface EdgeRun {
  /** Identifiant de la pièce dans la fiche. */
  readonly panel: string;
  readonly sheet: EdgeSheet;
  readonly role: EdgeRole;
  pieces: readonly Piece[];
}

/** Pièce de patron en cours d'assemblage : sa fiche, la pièce tracée et ses bords. */
export interface PanelRun {
  readonly sheet: PartSheet;
  readonly part: DraftedPart;
  readonly edges: readonly EdgeRun[];
}

/** Identifiant d'un des morceaux d'un bord : celui du bord s'il reste entier, sinon `<bord>-<rang>` (rang depuis 1). */
export const subEdgeId = (run: EdgeRun, index: number): string =>
  run.pieces.length === 1 ? run.sheet.id : `${run.sheet.id}-${index + 1}`;

/** Bord de la GarmentSpec : une droite ou une courbe, avec ses deux rôles. */
export interface PatternEdge {
  readonly id: string;
  readonly role: EdgeRole;
  readonly semanticRole: SemanticRole;
  readonly piece: Piece;
}

/** Cran posé sur un bord, à `distanceMm` de son début. */
export interface PatternNotch {
  readonly edgeId: string;
  readonly distanceMm: number;
  readonly count: number;
}

/** Pose d'une pièce telle que le contrat la veut : le point d'ancrage et son décalage depuis le repère de hauteur. */
export interface PatternPlacement {
  readonly zone: PlacementSheet['zone'];
  readonly bodySide: PlacementSheet['bodySide'];
  readonly facing: PlacementSheet['facing'];
  readonly landmark: PlacementSheet['landmark'];
  readonly anchorMm: PointMm;
  readonly offsetMm: number;
  readonly clearanceMm: number;
}

/** Pièce de la GarmentSpec, dans le repère de GarmentSpec (y vers le haut), valeurs brutes. */
export interface PatternPanel {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly cutOnFold: boolean;
  readonly edges: readonly PatternEdge[];
  readonly grainline?: readonly [PointMm, PointMm];
  readonly notches: readonly PatternNotch[];
  readonly placement: PatternPlacement;
}

export interface PatternSeamEnd {
  readonly panelId: string;
  readonly edgeId: string;
}

export interface PatternSeam {
  readonly id: string;
  readonly a: PatternSeamEnd;
  readonly b: PatternSeamEnd;
  /** Embu : a plus long que b de cette valeur ; absent si la couture n'en déclare pas. */
  readonly easeMm?: number;
}

/** Patron assemblé d'un modèle : le contenu d'une GarmentSpec, sans le contrat (le rendu est dans `src/spec/`). */
export interface Pattern {
  readonly garmentType: string;
  readonly panels: readonly PatternPanel[];
  readonly seams: readonly PatternSeam[];
}
