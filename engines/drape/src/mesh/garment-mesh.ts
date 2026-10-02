import type { GarmentSpec } from '@atelier/contracts-ts';
import type { ClothMesh } from '../core/types.js';
import { validateCloth } from '../core/validate.js';
import {
  flipTriangles,
  mirrorGrains,
  mirrorPositions,
  oppositeSide,
  planPanel,
  triangleGrains,
  type PanelPlan,
  type Side,
} from './copies.js';
import {
  DrapeTooLargeError,
  MAX_PANELS_PER_GARMENT,
  MAX_SEAMS_PER_GARMENT,
  MAX_VERTICES_PER_GARMENT,
  MESH_EDGE_MM,
  assertWithinDrapeLimits,
  type MeshQuality,
} from './limits.js';
import { assertPanelCoordinates } from './outline.js';
import { meshPanel, type PanelMesh } from './panel-mesh.js';
import {
  resolveSeams,
  seamSegmentCounts,
  sewPairs,
  type EdgeInstance,
  type SeamReport,
} from './seams.js';

// Vêtement entier à plat (ADR 0013, tâche 1.19d2) : pièces maillées, dépliées, copiées, cousues point à point.

/** Intervalle entre deux pièces posées côte à côte, en mm. */
export const PIECE_GAP_MM = 50;

/** Un exemplaire de pièce dans le maillage du vêtement : intervalles de sommets et de triangles. */
export interface GarmentPiece {
  panelId: string;
  /** 0 : la pièce telle que dessinée (ou dépliée) ; 1 : la copie miroir de `quantity: 2`. */
  copy: 0 | 1;
  /** Côté du porteur de l'exemplaire ; `center` pour une pièce sur pliure dépliée ou à cheval sur le milieu. */
  side: Side;
  /** Pièce coupée sur pliure, dépliée (contour complet). */
  unfolded: boolean;
  /** Copie miroir (symétrie gauche/droite des positions, triangles redressés). */
  mirrored: boolean;
  vertexStart: number;
  vertexCount: number;
  triangleStart: number;
  triangleCount: number;
}

export interface GarmentMesh {
  /** Vêtement à plat : x, y de la pièce (y vers le haut), z = 0, pièces côte à côte de gauche à droite ; `pinned` absent. */
  cloth: ClothMesh;
  /** Exemplaires de pièces, dans l'ordre de `spec.panels` (copie 0 puis copie 1). */
  pieces: readonly GarmentPiece[];
  /** Par sommet : index dans `pieces`. */
  vertexPiece: Uint32Array;
  /**
   * Par sommet : index dans `panel.edges` du contrat du bord qu'il commence ou dont il est un point intérieur
   * (une moitié symétrique d'une pièce dépliée renvoie au bord d'origine), -1 pour un sommet intérieur à la pièce.
   */
  vertexEdge: Int32Array;
  /** Une entrée par couple de bords cousus (une couture du contrat donne un ou deux couples), dans l'ordre. */
  seams: readonly SeamReport[];
}

interface Placed {
  plan: PanelPlan;
  mesh: PanelMesh;
  /** Premier sommet de l'exemplaire 0 ; l'exemplaire 1 suit. */
  base: number;
}

interface Buffers {
  positionsMm: Float64Array;
  flatMm: Float64Array;
  triangles: Uint32Array;
  grainUnit: Float64Array;
  vertexPiece: Uint32Array;
  vertexEdge: Int32Array;
  pieces: GarmentPiece[];
  /** Abscisse où poser la prochaine pièce, et premier triangle libre. */
  cursorX: number;
  nextTriangle: number;
}

function reversed(v: Uint32Array): Uint32Array {
  const out = new Uint32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[v.length - 1 - i] as number;
  return out;
}

function checkSize(spec: GarmentSpec): PanelPlan[] {
  assertWithinDrapeLimits(
    spec.panels.reduce((n, p) => n + p.edges.length, 0),
    0,
  );
  if (spec.seams.length > MAX_SEAMS_PER_GARMENT) {
    throw new DrapeTooLargeError(
      `${spec.seams.length} seams exceed the limit of ${MAX_SEAMS_PER_GARMENT}`,
    );
  }
  if (spec.panels.length > MAX_PANELS_PER_GARMENT) {
    throw new DrapeTooLargeError(
      `${spec.panels.length} panels exceed the limit of ${MAX_PANELS_PER_GARMENT}`,
    );
  }
  spec.panels.forEach(assertPanelCoordinates);
  const plans = spec.panels.map((p) => planPanel(p));
  assertWithinDrapeLimits(
    plans.reduce((n, p) => n + p.contour.edges.length * p.copies, 0),
    0,
  );
  return plans;
}

/**
 * Maille un vêtement complet à plat. Chaque pièce est maillée une fois (dépliée par symétrie si `cutOnFold`) ;
 * `quantity: 2` ajoute la copie miroir (x → −x, triangles et droit fil redressés). Les coutures du contrat sont
 * résolues par exemplaire (voir `Seam`, `EdgeRef.side`), les bords d'un même groupe de coutures reçoivent le même
 * nombre de parts, et les points sont cousus par rang, le second bord en sens inverse. Erreurs : `InvalidInputError`
 * (code `mesh`) pour une pièce ou une couture inexploitable, `DrapeTooLargeError` au-delà des limites du vêtement.
 */
export function meshGarment(spec: GarmentSpec, quality: MeshQuality): GarmentMesh {
  const plans = checkSize(spec);
  const { pairs } = resolveSeams(plans, spec.seams);
  const counts = seamSegmentCounts(plans, pairs, MESH_EDGE_MM[quality]);
  const edgeTotal = plans.reduce((n, p) => n + p.contour.edges.length * p.copies, 0);
  let vertexTotal = 0;
  let triangleTotal = 0;
  const placed: Placed[] = plans.map((plan, i) => {
    const room = Math.floor((MAX_VERTICES_PER_GARMENT - vertexTotal) / plan.copies);
    const mesh = meshPanel(plan.contour, quality, {
      edgeSegments: counts.get(i),
      maxVertices: room,
    });
    const nv = mesh.positionsMm.length / 2;
    const base = vertexTotal;
    vertexTotal += nv * plan.copies;
    triangleTotal += (mesh.triangles.length / 3) * plan.copies;
    assertWithinDrapeLimits(edgeTotal, vertexTotal);
    return { plan, mesh, base };
  });
  return assemble(placed, pairs, vertexTotal, triangleTotal);
}

/** Écrit dans `vertexEdge` le bord d'origine de chaque sommet du contour d'un exemplaire. */
function recordEdges(vertexEdge: Int32Array, p: Placed, vertexStart: number): void {
  p.mesh.boundary.forEach((b, i) => {
    const edgeIndex = (p.plan.edgeOrigin[i] as { edgeIndex: number }).edgeIndex;
    for (let k = 0; k + 1 < b.vertexIndices.length; k++) {
      vertexEdge[vertexStart + (b.vertexIndices[k] as number)] = edgeIndex;
    }
  });
}

function xRange(positions: Float64Array): [number, number] {
  let minX = Infinity;
  let maxX = -Infinity;
  for (let v = 0; v < positions.length; v += 2) {
    minX = Math.min(minX, positions[v] as number);
    maxX = Math.max(maxX, positions[v] as number);
  }
  return [minX, maxX];
}

/** Pose un exemplaire de pièce dans les tableaux du vêtement. */
function placeCopy(buf: Buffers, p: Placed, grains: Float64Array, copy: 0 | 1): void {
  const { plan, mesh } = p;
  const flip = copy === 1;
  const nv = mesh.positionsMm.length / 2;
  const local = flip ? mirrorPositions(mesh.positionsMm) : mesh.positionsMm;
  const vertexStart = p.base + copy * nv;
  const [minX, maxX] = xRange(local);
  const shift = buf.cursorX - minX;
  buf.cursorX += maxX - minX + PIECE_GAP_MM;
  for (let v = 0; v < nv; v++) {
    const g = vertexStart + v;
    const x = (local[2 * v] as number) + shift;
    buf.flatMm[2 * g] = x;
    buf.flatMm[2 * g + 1] = local[2 * v + 1] as number;
    buf.positionsMm[3 * g] = x;
    buf.positionsMm[3 * g + 1] = local[2 * v + 1] as number;
    buf.vertexPiece[g] = buf.pieces.length;
  }
  const tris = flip ? flipTriangles(mesh.triangles) : mesh.triangles;
  for (let k = 0; k < tris.length; k++) {
    buf.triangles[3 * buf.nextTriangle + k] = (tris[k] as number) + vertexStart;
  }
  buf.grainUnit.set(flip ? mirrorGrains(grains) : grains, 2 * buf.nextTriangle);
  recordEdges(buf.vertexEdge, p, vertexStart);
  const unfolded = plan.fold !== undefined;
  buf.pieces.push({
    panelId: plan.panel.id,
    copy,
    side: unfolded ? 'center' : flip ? oppositeSide(plan.drawnSide) : plan.drawnSide,
    unfolded,
    mirrored: flip,
    vertexStart,
    vertexCount: nv,
    triangleStart: buf.nextTriangle,
    triangleCount: mesh.triangles.length / 3,
  });
  buf.nextTriangle += mesh.triangles.length / 3;
}

/** Sommets globaux d'un bord d'exemplaire, dans le sens du parcours (inversé pour la copie miroir). */
function edgeVertices(placed: readonly Placed[], inst: EdgeInstance): Uint32Array {
  const p = placed[inst.plan] as Placed;
  const list = (p.mesh.boundary[inst.contourEdge] as { vertexIndices: Uint32Array }).vertexIndices;
  const offset = p.base + inst.copy * (p.mesh.positionsMm.length / 2);
  const global = list.map((v) => v + offset);
  return inst.copy === 1 ? reversed(global) : global;
}

function assemble(
  placed: readonly Placed[],
  pairs: ReturnType<typeof resolveSeams>['pairs'],
  vertexTotal: number,
  triangleTotal: number,
): GarmentMesh {
  const buf: Buffers = {
    positionsMm: new Float64Array(3 * vertexTotal),
    flatMm: new Float64Array(2 * vertexTotal),
    triangles: new Uint32Array(3 * triangleTotal),
    grainUnit: new Float64Array(2 * triangleTotal),
    vertexPiece: new Uint32Array(vertexTotal),
    vertexEdge: new Int32Array(vertexTotal).fill(-1),
    pieces: [],
    cursorX: 0,
    nextTriangle: 0,
  };
  for (const p of placed) {
    const grains = triangleGrains(p.plan, p.mesh.positionsMm, p.mesh.triangles);
    for (let copy = 0; copy < p.plan.copies; copy++) placeCopy(buf, p, grains, copy as 0 | 1);
  }
  const { stitches, reports } = sewPairs(pairs, (i) => edgeVertices(placed, i), buf.flatMm);
  const { positionsMm, flatMm, triangles, grainUnit } = buf;
  const cloth: ClothMesh = { positionsMm, flatMm, triangles, grainUnit, stitches };
  validateCloth(cloth);
  return {
    cloth,
    pieces: buf.pieces,
    vertexPiece: buf.vertexPiece,
    vertexEdge: buf.vertexEdge,
    seams: reports,
  };
}
