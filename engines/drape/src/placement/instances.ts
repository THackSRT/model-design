import type { GarmentSpec, Panel } from '@atelier/contracts-ts';
import type { GarmentMesh, GarmentPiece } from '../mesh/garment-mesh.js';
import type { Side } from './frames.js';
import type { Facing } from './levels.js';
import { PlacementError, type AvatarShape, type Zone } from './types.js';

// Un exemplaire de pièce à poser : sa pose (`Panel.placement`) lue une fois, avec le niveau d'ancrage et l'abscisse
// de l'ancre dans le repère de l'exemplaire (miroir comprise).

export interface Instance {
  piece: GarmentPiece;
  panelId: string;
  zone: Zone;
  /** Côté du porteur de l'exemplaire (`center` pour une pièce dépliée ou posée sur le milieu). */
  side: Side;
  facing: Facing;
  /** Abscisse et ordonnée de l'ancre dans le repère de l'exemplaire (x change de signe pour une copie miroir). */
  anchorU: number;
  anchorV: number;
  /** Hauteur depuis le sol du niveau d'ancrage, mm. */
  heightMm: number;
  clearanceMm: number;
}

const DEFAULT_CLEARANCE_MM = 30;

/** Les pièces sans `placement` : `placement-missing` (aucune pose possible, donc aucun drapé). */
export function assertPlacements(spec: GarmentSpec): void {
  for (const panel of spec.panels) {
    if (panel.placement === undefined) {
      throw new PlacementError('placement-missing', panel.id, `panel ${panel.id} has no placement`);
    }
  }
}

function instanceOf(piece: GarmentPiece, panel: Panel, avatar: AvatarShape): Instance {
  const pl = panel.placement as NonNullable<Panel['placement']>;
  const anchor = pl.anchor;
  const height = avatar.landmarksMm[anchor.landmark] + (anchor.offsetMm ?? 0);
  if (!Number.isFinite(height)) {
    throw new PlacementError(
      'placement-failed',
      panel.id,
      `panel ${panel.id}: anchor height is not finite`,
    );
  }
  return {
    piece,
    panelId: panel.id,
    zone: pl.zone,
    side: piece.side,
    facing: pl.facing,
    anchorU: piece.mirrored ? -anchor.point[0] : anchor.point[0],
    anchorV: anchor.point[1],
    heightMm: height,
    clearanceMm: pl.clearanceMm ?? DEFAULT_CLEARANCE_MM,
  };
}

export function instancesOf(mesh: GarmentMesh, spec: GarmentSpec, avatar: AvatarShape): Instance[] {
  const panels = new Map(spec.panels.map((p) => [p.id, p]));
  return mesh.pieces.map((piece) => {
    const panel = panels.get(piece.panelId) as Panel;
    return instanceOf(piece, panel, avatar);
  });
}
