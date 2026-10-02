import type { GarmentSpec, Panel } from '@atelier/contracts-ts';
import type { Holds } from '../core/types.js';
import type { GarmentMesh, GarmentPiece } from '../mesh/garment-mesh.js';
import type { AvatarShape } from './types.js';

// Tenues du vêtement pendant la mise en forme (ADR 0013, « Maintien ») : les bords `waistline` des pièces du tronc et
// des jambes sont tenus en hauteur, à la hauteur où ils sont posés ; ils se resserrent sur le corps sans glisser.

/** Axe d'une tenue de ceinture : la verticale. */
const UP: readonly [number, number, number] = [0, 1, 0];

/** Sommets d'un exemplaire sur un bord `waistline` d'une pièce du tronc ou d'une jambe. */
function waistlineVertices(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  panel: Panel | undefined,
): number[] {
  const zone = panel?.placement?.zone;
  if (!panel || (zone !== 'torso' && zone !== 'leg')) return [];
  const found: number[] = [];
  for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
    const edge = mesh.vertexEdge[v] as number;
    if (edge >= 0 && panel.edges[edge]?.role === 'waistline') found.push(v);
  }
  return found;
}

/**
 * Tenues des sommets des bords `waistline` des pièces `torso` et `leg` : axe vertical, cible = hauteur de départ
 * (`startMm`, positions de départ du vêtement). `undefined` s'il n'y en a aucune. `avatar` : réservé aux tenues
 * d'épaule et de manche (1.19e2c), sans effet ici.
 */
export function garmentHolds(
  mesh: GarmentMesh,
  spec: GarmentSpec,
  avatar: AvatarShape,
  startMm: Float64Array,
): Holds | undefined {
  void avatar;
  const panels = new Map<string, Panel>(spec.panels.map((p) => [p.id, p]));
  const vertices = mesh.pieces.flatMap((piece) =>
    waistlineVertices(mesh, piece, panels.get(piece.panelId)),
  );
  if (vertices.length === 0) return undefined;
  return {
    vertices: Uint32Array.from(vertices),
    axes: Float64Array.from(vertices.flatMap(() => UP)),
    targetsMm: Float64Array.from(vertices, (v) => startMm[3 * v + 1] as number),
  };
}
