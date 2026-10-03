import type { Panel } from '@atelier/contracts-ts';
import { triangulateOutline } from './build.js';
import { interiorLattice } from './lattice.js';
import {
  MAX_VERTICES_PER_GARMENT,
  MESH_EDGE_MM,
  assertVertexBudget,
  assertWithinDrapeLimits,
  type MeshQuality,
} from './limits.js';
import { flattenPanelOutline } from './outline.js';

export interface MeshPanelOptions {
  /** Nombre de parts imposé à certains bords (index dans `panel.edges`), pour apparier les points d'une couture. */
  edgeSegments?: ReadonlyMap<number, number>;
  /** Sommets au plus pour cette pièce (reste du budget du vêtement) ; défaut : `MAX_VERTICES_PER_GARMENT`. */
  maxVertices?: number;
}

/** Nombre de sommets attendu : aire (formule du lacet) / aire d'un triangle équilatéral de côté h + points du contour. */
function estimatedVertices(outline: Float64Array, edgeMm: number): number {
  const n = outline.length / 2;
  let twice = 0;
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    twice += (outline[2 * i] as number) * (outline[2 * j + 1] as number);
    twice -= (outline[2 * j] as number) * (outline[2 * i + 1] as number);
  }
  return Math.abs(twice) / 2 / ((Math.sqrt(3) / 2) * edgeMm * edgeMm) + n;
}

export interface PanelMesh {
  /** x, y à plat (mm), 2 valeurs par sommet ; les sommets du contour d'abord, dans l'ordre du contour. */
  positionsMm: Float64Array;
  /** 3 indices de sommets par triangle, antihoraires à plat (y vers le haut). */
  triangles: Uint32Array;
  /**
   * Pour chaque bord du contrat (dans l'ordre de `panel.edges`) : `vertexIndices`, du début (from) à la fin (to)
   * du bord, extrémités comprises. La fin d'un bord est le début du suivant (le dernier bord finit au sommet 0).
   */
  boundary: readonly { edgeIndex: number; vertexIndices: Uint32Array }[];
}

/**
 * Maillage triangulaire à plat d'une pièce : contour rééchantillonné au pas h de la qualité (bords exacts),
 * sommets intérieurs sur un réseau triangulaire de pas h à plus de h/2 du bord, triangulation de Delaunay
 * contrainte au contour. Pièce simple (contour sans croisement, sans trou) ; sinon `InvalidInputError`. Au-delà de
 * 30 000 sommets : `DrapeTooLargeError`.
 */
export function meshPanel(
  panel: Panel,
  quality: MeshQuality,
  options: MeshPanelOptions = {},
): PanelMesh {
  const edgeMm = MESH_EDGE_MM[quality];
  const max = Math.min(options.maxVertices ?? MAX_VERTICES_PER_GARMENT, MAX_VERTICES_PER_GARMENT);
  const { pointsMm: outline, edgeStarts } = flattenPanelOutline(
    panel,
    edgeMm,
    options.edgeSegments,
    max,
  );
  const boundaryCount = outline.length / 2;
  assertWithinDrapeLimits(panel.edges.length, boundaryCount);
  assertVertexBudget(estimatedVertices(outline, edgeMm), max);
  const interior = interiorLattice(outline, edgeMm, max - boundaryCount);
  assertVertexBudget(boundaryCount + interior.length / 2, max);
  const points = new Float64Array(outline.length + interior.length);
  points.set(outline);
  points.set(interior, outline.length);
  const { positionsMm, triangles } = triangulateOutline(points, boundaryCount, edgeMm, max);
  assertVertexBudget(positionsMm.length / 2, max);
  const boundary = panel.edges.map((_, edgeIndex) => {
    const from = edgeStarts[edgeIndex] as number;
    const to =
      edgeIndex + 1 === edgeStarts.length ? boundaryCount : (edgeStarts[edgeIndex + 1] as number);
    const vertexIndices = new Uint32Array(to - from + 1);
    for (let i = 0; i < vertexIndices.length; i++) vertexIndices[i] = (from + i) % boundaryCount;
    return { edgeIndex, vertexIndices };
  });
  return { positionsMm, triangles, boundary };
}
