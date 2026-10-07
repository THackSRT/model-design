import type {
  Edge,
  GarmentSpec,
  Notch,
  Panel,
  PanelPlacement,
  Point,
  Seam,
} from '@atelier/contracts-ts';
import { modelEntry } from '../adapters/freesewing/models.js';
import { assemblePattern } from '../core/pattern.js';
import type {
  PatternEdge,
  PatternNotch,
  PatternPanel,
  PatternPlacement,
  PatternSeam,
} from '../core/pattern-types.js';
import { roundMm } from '../core/round.js';
import type { ModelSheet } from '../core/sheet.js';
import type { PointMm } from '../core/types.js';
import type { DraftResult } from '../draft.js';
import { ENGINE_VERSION } from '../version.js';

// Le patron assemblé (src/core) est dans le repère de GarmentSpec ; ce fichier n'y ajoute que l'écriture du contrat :
// tableaux de coordonnées arrondies à 0,001 mm, champs facultatifs absents quand ils n'ont pas de valeur.

const pointOf = (point: PointMm): Point => [roundMm(point.xMm), roundMm(point.yMm)];

function edgeOf({ id, role, semanticRole, piece }: PatternEdge): Edge {
  const controls: [Point, Point] | undefined =
    piece.kind === 'curve' ? [pointOf(piece.c1), pointOf(piece.c2)] : undefined;
  return {
    id,
    from: pointOf(piece.p0),
    to: pointOf(piece.p1),
    ...(controls === undefined ? {} : { controls }),
    role,
    semanticRole,
  };
}

const notchOf = ({ edgeId, distanceMm, count }: PatternNotch): Notch => ({
  edgeId,
  distanceMm: roundMm(distanceMm),
  count,
});

const placementOf = (placement: PatternPlacement): PanelPlacement => ({
  zone: placement.zone,
  bodySide: placement.bodySide,
  facing: placement.facing,
  anchor: {
    point: pointOf(placement.anchorMm),
    landmark: placement.landmark,
    offsetMm: roundMm(placement.offsetMm),
  },
  clearanceMm: placement.clearanceMm,
});

function panelOf(panel: PatternPanel): Panel {
  const grainline: [Point, Point] | undefined =
    panel.grainline === undefined
      ? undefined
      : [pointOf(panel.grainline[0]), pointOf(panel.grainline[1])];
  return {
    id: panel.id,
    name: panel.name,
    edges: panel.edges.map(edgeOf) as Panel['edges'],
    ...(grainline === undefined ? {} : { grainline }),
    quantity: panel.quantity,
    cutOnFold: panel.cutOnFold,
    ...(panel.notches.length === 0 ? {} : { notches: panel.notches.map(notchOf) }),
    placement: placementOf(panel.placement),
  };
}

const seamOf = (seam: PatternSeam): Seam => ({
  id: seam.id,
  a: seam.a,
  b: seam.b,
  ...(seam.easeMm === undefined ? {} : { easeMm: seam.easeMm }),
});

/**
 * La GarmentSpec 1.1 d'un tracé, d'après une fiche de couture : pièces au pli ou en paire, bords droits ou en une seule
 * courbe de Bézier avec leurs rôles structurel et sémantique, coutures appariées (les bords coupés pour s'apparier
 * gardent leur rôle), embu déclaré par la fiche, crans, droit fil, pose autour du corps. Pur et déterministe ; erreur
 * typée si la fiche ou le tracé est en défaut, ou si une couture s'écarte de l'embu déclaré de plus que la fiche ne le tolère.
 */
export function garmentSpecOf(
  sheet: ModelSheet,
  draft: Pick<DraftResult, 'parts' | 'values'>,
): GarmentSpec {
  const pattern = assemblePattern(sheet, draft.parts, draft.values);
  return {
    specVersion: '1.1',
    unit: 'mm',
    engine: { name: 'drafting', version: ENGINE_VERSION },
    garment: { type: pattern.garmentType },
    panels: pattern.panels.map(panelOf) as GarmentSpec['panels'],
    seams: pattern.seams.map(seamOf),
  };
}

/** La GarmentSpec d'un tracé du catalogue, d'après la fiche de couture de son modèle (`garmentSpecOf`). */
export const toGarmentSpec = (draft: DraftResult): GarmentSpec =>
  garmentSpecOf(modelEntry(draft.model).sheet, draft);
