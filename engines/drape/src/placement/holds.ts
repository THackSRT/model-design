import type { GarmentSpec, Panel } from '@atelier/contracts-ts';
import type { Holds } from '../core/types.js';
import type { GarmentMesh, GarmentPiece } from '../mesh/garment-mesh.js';
import type { Vec3, AvatarShape } from './types.js';

// Tenues du vêtement pendant la mise en forme (ADR 0013, « Maintien ») : les bords `waistline` des pièces du tronc et
// des jambes sont tenus en hauteur, à la hauteur où ils sont posés ; les coutures d'épaule aussi (le haut du corsage
// ne glisse pas) ; le haut de manche est tenu sur l'axe du bras. Les sommets se resserrent sur le corps sans glisser.

/** Axe d'une tenue de ceinture ou d'épaule : la verticale. */
const UP: Vec3 = [0, 1, 0];
/** Une couture d'épaule est entière à cette distance sous `shoulder` au moins (hauteur reportée), mm. */
const SHOULDER_BAND_MM = 30;
/** Un bord de manche tenu a une extrémité à cette distance de l'ancre, mm. */
const ANCHOR_TOLERANCE_MM = 0.5;

interface Hold {
  vertex: number;
  axis: Vec3;
}

/** Sommets de l'exemplaire sur les bords (indices dans le contrat) de la pièce qui vérifient `keep`. */
function edgeVertices(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  keep: (edge: number) => boolean,
): number[] {
  const found: number[] = [];
  for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
    const edge = mesh.vertexEdge[v] as number;
    if (edge >= 0 && keep(edge)) found.push(v);
  }
  return found;
}

function waistlineHolds(mesh: GarmentMesh, piece: GarmentPiece, panel: Panel): Hold[] {
  const zone = panel.placement?.zone;
  if (zone !== 'torso' && zone !== 'leg') return [];
  return edgeVertices(mesh, piece, (e) => panel.edges[e]?.role === 'waistline').map((vertex) => ({
    vertex,
    axis: UP,
  }));
}

/** Hauteur reportée (mm depuis le sol) de chaque point du bord `e` de la pièce, et vrai s'ils sont tous assez hauts. */
function edgeIsHigh(panel: Panel, e: number, minMm: number, heightMm: number): boolean {
  const anchorY = panel.placement?.anchor.point[1] ?? 0;
  const n = panel.edges.length;
  const ends = [panel.edges[e]?.from, panel.edges[(e + 1) % n]?.from];
  return ends.every((p) => p !== undefined && heightMm + p[1] - anchorY >= minMm);
}

/** Couture d'épaule : couture entre une pièce `torso` `front` et une `back` dont tous les points sont assez hauts. */
function shoulderEdges(
  spec: GarmentSpec,
  avatar: AvatarShape,
  heights: Map<string, number>,
): Set<string> {
  const panels = new Map(spec.panels.map((p) => [p.id, p]));
  const out = new Set<string>();
  const minMm = avatar.landmarksMm.shoulder - SHOULDER_BAND_MM;
  for (const seam of spec.seams) {
    const [pa, pb] = [panels.get(seam.a.panelId), panels.get(seam.b.panelId)];
    const facings = [pa?.placement, pb?.placement].map((p) =>
      p?.zone === 'torso' ? p.facing : '',
    );
    if (!pa || !pb || facings.sort().join('|') !== 'back|front') continue;
    for (const [panel, ref] of [
      [pa, seam.a],
      [pb, seam.b],
    ] as const) {
      const e = panel.edges.findIndex((x) => x.id === ref.edgeId);
      const base = heights.get(panel.id) as number;
      if (e >= 0 && edgeIsHigh(panel, e, minMm, base)) out.add(`${panel.id}|${e}`);
    }
  }
  return out;
}

function shoulderHolds(mesh: GarmentMesh, piece: GarmentPiece, tagged: Set<string>): Hold[] {
  return edgeVertices(mesh, piece, (e) => tagged.has(`${piece.panelId}|${e}`)).map((vertex) => ({
    vertex,
    axis: UP,
  }));
}

/** Bords d'une pièce `arm` dont une extrémité est l'ancre (haut de manche), tenus sur l'axe du bras vers le haut. */
function sleeveHolds(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  panel: Panel,
  avatar: AvatarShape,
): Hold[] {
  const placement = panel.placement;
  if (placement?.zone !== 'arm' || (piece.side !== 'left' && piece.side !== 'right')) return [];
  const anchor = placement.anchor.point;
  const axis = avatar.arms[piece.side].axis;
  const up: Vec3 = [-axis[0], -axis[1], -axis[2]];
  const n = panel.edges.length;
  const atAnchor = (p: readonly number[] | undefined): boolean =>
    p !== undefined &&
    Math.abs((p[0] as number) - anchor[0]) <= ANCHOR_TOLERANCE_MM &&
    Math.abs((p[1] as number) - anchor[1]) <= ANCHOR_TOLERANCE_MM;
  const keep = (e: number): boolean =>
    atAnchor(panel.edges[e]?.from) || atAnchor(panel.edges[(e + 1) % n]?.from);
  return edgeVertices(mesh, piece, keep).map((vertex) => ({ vertex, axis: up }));
}

/**
 * Tenues des sommets : bords `waistline` des pièces `torso` et `leg` et coutures d'épaule (axe vertical), haut de
 * manche (axe du bras). Cible = position de départ (`startMm`) le long de l'axe. `undefined` s'il n'y en a aucune.
 */
export function garmentHolds(
  mesh: GarmentMesh,
  spec: GarmentSpec,
  avatar: AvatarShape,
  startMm: Float64Array,
): Holds | undefined {
  const panels = new Map<string, Panel>(spec.panels.map((p) => [p.id, p]));
  const heights = new Map<string, number>(
    spec.panels.map((p) => [
      p.id,
      p.placement
        ? avatar.landmarksMm[p.placement.anchor.landmark] + (p.placement.anchor.offsetMm ?? 0)
        : 0,
    ]),
  );
  const shoulder = shoulderEdges(spec, avatar, heights);
  const holds = mesh.pieces.flatMap((piece) => {
    const panel = panels.get(piece.panelId);
    if (!panel) return [];
    return [
      ...waistlineHolds(mesh, piece, panel),
      ...shoulderHolds(mesh, piece, shoulder),
      ...sleeveHolds(mesh, piece, panel, avatar),
    ];
  });
  if (holds.length === 0) return undefined;
  const targets = holds.map(({ vertex, axis }) => {
    const base = 3 * vertex;
    return (
      axis[0] * (startMm[base] as number) +
      axis[1] * (startMm[base + 1] as number) +
      axis[2] * (startMm[base + 2] as number)
    );
  });
  return {
    vertices: Uint32Array.from(holds, (h) => h.vertex),
    axes: Float64Array.from(holds.flatMap((h) => h.axis)),
    targetsMm: Float64Array.from(targets),
  };
}
