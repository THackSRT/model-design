import { readFileSync } from 'node:fs';
import type { DrapeJob, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { meshGarment, type MeshQuality } from '../src/index.js';
import { buildAvatar, type AvatarShape, type DrapeOutcome } from '../src/node.js';

// Aides des tests de drapé sur l'avatar. Mesures fictives (jamais réelles) : celles des références du patronage.

export const fixture = (name: string): GarmentSpec =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

export const MEASUREMENTS: MeasurementSet = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 640,
  hipGirthMm: 960,
  crotchHeightMm: 770,
};

export function jobOf(spec: GarmentSpec, over: Partial<DrapeJob> = {}): DrapeJob {
  return {
    drapeId: '00000000-0000-4000-8000-000000000001',
    organizationId: '00000000-0000-4000-8000-000000000002',
    designId: '00000000-0000-4000-8000-000000000003',
    versionNumber: 1,
    spec,
    measurements: { ...MEASUREMENTS },
    avatar: {},
    fabric: { preset: 'cotton-poplin' },
    quality: 'draft',
    ...over,
  };
}

// Mesures partagées par les tests de drapé en brouillon et en standard.

type GarmentMesh = ReturnType<typeof meshGarment>;

/** Plus grand écart entre les deux sommets d'une couture. */
export function seamGaps(positions: ArrayLike<number>, stitches: Uint32Array): number {
  let widest = 0;
  for (let k = 0; k < stitches.length; k += 2) {
    const [a, b] = [stitches[k] as number, stitches[k + 1] as number];
    const dx = (positions[3 * a] as number) - (positions[3 * b] as number);
    const dy = (positions[3 * a + 1] as number) - (positions[3 * b + 1] as number);
    const dz = (positions[3 * a + 2] as number) - (positions[3 * b + 2] as number);
    widest = Math.max(widest, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return widest;
}

/** Allongement absolu des arêtes de triangle au 95e centile (position de départ contre longueur à plat). */
export function startStrainP95(mesh: GarmentMesh, start: ArrayLike<number>): number {
  const { flatMm, triangles } = mesh.cloth;
  const strains: number[] = [];
  for (let k = 0; k < triangles.length; k += 3) {
    for (let j = 0; j < 3; j++) {
      const a = triangles[k + j] as number;
      const b = triangles[k + ((j + 1) % 3)] as number;
      const flat = Math.hypot(
        (flatMm[2 * b] as number) - (flatMm[2 * a] as number),
        (flatMm[2 * b + 1] as number) - (flatMm[2 * a + 1] as number),
      );
      const now = Math.hypot(
        (start[3 * b] as number) - (start[3 * a] as number),
        (start[3 * b + 1] as number) - (start[3 * a + 1] as number),
        (start[3 * b + 2] as number) - (start[3 * a + 2] as number),
      );
      strains.push(Math.abs(now / flat - 1));
    }
  }
  strains.sort((p, q) => p - q);
  return strains[Math.floor(0.95 * strains.length)] as number;
}

export const median = (values: number[]): number => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[sorted.length >> 1] as number;
};

/** Sommets des bords de rôle `hem`. */
export function hemVertices(mesh: GarmentMesh, spec: GarmentSpec): number[] {
  const panels = new Map(spec.panels.map((p) => [p.id, p]));
  const found: number[] = [];
  for (const piece of mesh.pieces) {
    for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
      const edge = mesh.vertexEdge[v] as number;
      if (edge >= 0 && panels.get(piece.panelId)?.edges[edge]?.role === 'hem') found.push(v);
    }
  }
  return found;
}

/** Hauteur médiane du bas de la ceinture (sommets de la ceinture à y = 0 à plat). */
export function bandBottom(mesh: GarmentMesh, positions: ArrayLike<number>): number {
  const heights: number[] = [];
  for (const piece of mesh.pieces.filter((p) => p.panelId.startsWith('waistband'))) {
    for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
      if ((mesh.cloth.flatMm[2 * v + 1] as number) < 1e-6)
        heights.push(positions[3 * v + 1] as number);
    }
  }
  return median(heights);
}

/** Plus grand écart des coutures dont les sommets sont sur un bord nommé `shoulder`. */
export function shoulderGap(
  spec: GarmentSpec,
  positions: ArrayLike<number>,
  quality: MeshQuality = 'draft',
): number {
  const mesh = meshGarment(spec, quality);
  const panels = new Map(spec.panels.map((p) => [p.id, p]));
  const onShoulder = (v: number): boolean => {
    const piece = mesh.pieces.find((p) => v >= p.vertexStart && v < p.vertexStart + p.vertexCount);
    const edge = mesh.vertexEdge[v] as number;
    return edge >= 0 && panels.get(piece?.panelId ?? '')?.edges[edge]?.id === 'shoulder';
  };
  let widest = 0;
  for (let k = 0; k < mesh.cloth.stitches.length; k += 2) {
    const [a, b] = [mesh.cloth.stitches[k] as number, mesh.cloth.stitches[k + 1] as number];
    if (!onShoulder(a) || !onShoulder(b)) continue;
    const d = [0, 1, 2].map(
      (i) => (positions[3 * a + i] as number) - (positions[3 * b + i] as number),
    );
    widest = Math.max(widest, Math.sqrt(d.reduce((s, x) => s + x * x, 0)));
  }
  return widest;
}

/** Hauteurs finales des sommets des bords dont l'identifiant ou le rôle est dans `names`. */
export function edgeHeights(
  spec: GarmentSpec,
  out: DrapeOutcome,
  names: string[],
  by: 'id' | 'role' = 'id',
): number[] {
  if (!out.ok) return [];
  const panels = new Map(spec.panels.map((p) => [p.id, p]));
  const found: number[] = [];
  for (const piece of out.mesh.pieces) {
    for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
      const edge = out.mesh.vertexEdge[v] as number;
      const name = edge >= 0 ? panels.get(piece.panelId)?.edges[edge]?.[by] : undefined;
      if (name !== undefined && names.includes(name))
        found.push(out.positionsMm[3 * v + 1] as number);
    }
  }
  return found;
}

/** Plus haut point des manches le long de l'axe du bras, depuis l'épaule (mm). */
export function sleeveTop(out: DrapeOutcome, avatar: AvatarShape): number {
  if (!out.ok) return Number.NaN;
  const final = out.positionsMm;
  let top = -Infinity;
  for (const piece of out.mesh.pieces.filter((p) => p.panelId === 'sleeve')) {
    if (piece.side !== 'left' && piece.side !== 'right') continue;
    const { axis, shoulderMm } = avatar.arms[piece.side];
    for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
      const along = [0, 1, 2].reduce(
        (s, i) =>
          s - (axis[i] as number) * ((final[3 * v + i] as number) - (shoulderMm[i] as number)),
        0,
      );
      top = Math.max(top, along);
    }
  }
  return top;
}

/** Angle des bras de la pose de référence des critères du corsage (ADR 0013 : 30°). */
const REFERENCE_ARM_ANGLE_DEG = 30;

/** Hauteur du dessus de l'épaule : sommet du corps dans une bande de 12 mm autour de l'x de l'articulation gauche. */
function shoulderTopMm(avatar: AvatarShape): number {
  const joint = avatar.arms.left.shoulderMm[0];
  const p = avatar.body.positionsMm;
  let top = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    if (Math.abs((p[i] as number) - joint) < 6) top = Math.max(top, p[i + 1] as number);
  }
  return top;
}

/**
 * Déplacement vertical du dessus de l'épaule de l'avatar, par rapport à la pose de référence à 30° (nul à 30°).
 * Un corsage pend des épaules : son bas se compte depuis l'épaule, donc `waist + shoulderShiftMm` (ADR 0018).
 */
export function shoulderShiftMm(avatar: AvatarShape, measurements: MeasurementSet): number {
  const reference = buildAvatar(measurements, { armAngleDeg: REFERENCE_ARM_ANGLE_DEG });
  return shoulderTopMm(avatar) - shoulderTopMm(reference);
}
