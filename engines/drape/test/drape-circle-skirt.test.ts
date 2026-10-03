import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildAvatar,
  drapeGarment,
  loadAvatarEngine,
  placeGarment,
  type AvatarShape,
  type DrapeOutcome,
} from '../src/node.js';
import { meshGarment, PENETRATION_TOLERANCE_MM, SEAM_TOLERANCE_MM } from '../src/index.js';
import { costRatio } from './helpers.js';
import { fixture, jobOf, MEASUREMENTS } from './drape-helpers.js';

// Jupe cercle en brouillon sur l'avatar, bras à 30° (ADR 0013, 1.19e2a4 : départ en godets, réglage fin, double passe
// de couture). Mesures fictives des références, popeline.

const spec = fixture('circle-skirt');
const ARMS = { armAngleDeg: 30 };
const MAX_START_GAP_MM = 120;
const MAX_START_STRAIN = 0.25;
const SKIRT_LENGTH_MM = 650;
const HIP_RADIUS_MM = MEASUREMENTS.hipGirthMm / (2 * Math.PI);

function seamGaps(positions: ArrayLike<number>, stitches: Uint32Array): number {
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
function startStrainP95(mesh: ReturnType<typeof meshGarment>, start: ArrayLike<number>): number {
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

const median = (values: number[]): number => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[sorted.length >> 1] as number;
};

describe('jupe cercle en brouillon sur l’avatar, bras à 30°', () => {
  let avatar: AvatarShape;
  let out: DrapeOutcome;
  const mesh = meshGarment(spec, 'draft');
  const panels = new Map(spec.panels.map((p) => [p.id, p]));

  /** Sommets des bords de rôle `hem`. */
  const hemVertices = (): number[] => {
    const found: number[] = [];
    for (const piece of mesh.pieces) {
      for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
        const edge = mesh.vertexEdge[v] as number;
        if (edge >= 0 && panels.get(piece.panelId)?.edges[edge]?.role === 'hem') found.push(v);
      }
    }
    return found;
  };

  /** Hauteur médiane du bas de la ceinture (sommets de la ceinture à y = 0 à plat). */
  const bandBottom = (positions: ArrayLike<number>): number => {
    const heights: number[] = [];
    for (const piece of mesh.pieces.filter((p) => p.panelId.startsWith('waistband'))) {
      for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
        if ((mesh.cloth.flatMm[2 * v + 1] as number) < 1e-6) {
          heights.push(positions[3 * v + 1] as number);
        }
      }
    }
    return median(heights);
  };

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, ARMS);
    out = drapeGarment(jobOf(spec, { avatar: ARMS }));
  });

  it('part avec un allongement des arêtes à 25 % au 95e centile (avant : 222 %), coutures à moins de 120 mm', () => {
    const start = placeGarment(mesh, spec, avatar);
    expect(start.every(Number.isFinite)).toBe(true);
    expect(startStrainP95(mesh, start)).toBeLessThanOrEqual(MAX_START_STRAIN);
    expect(seamGaps(start, mesh.cloth.stitches)).toBeLessThan(MAX_START_GAP_MM);
  });

  it('drape en succès, convergé en 400 pas au plus', () => {
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.converged).toBe(true);
    expect(out.result.simulatedSteps).toBeLessThanOrEqual(400);
  });

  it('ne pénètre pas le corps (parité) et ferme ses coutures', () => {
    if (!out.ok) throw new Error('drape failed');
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
  });

  it('finit à la taille : bas de ceinture entre waist − 40 et waist + 10 mm', () => {
    if (!out.ok) throw new Error('drape failed');
    const bottom = bandBottom(out.positionsMm);
    expect(bottom).toBeGreaterThanOrEqual(avatar.landmarksMm.waist - 40);
    expect(bottom).toBeLessThanOrEqual(avatar.landmarksMm.waist + 10);
  });

  it('garde son volume : rayon médian de l’ourlet au moins 1,5 fois celui de la hanche', () => {
    if (!out.ok) throw new Error('drape failed');
    const hem = hemVertices();
    const p = out.positionsMm;
    const cx = hem.reduce((s, v) => s + (p[3 * v] as number), 0) / hem.length;
    const cz = hem.reduce((s, v) => s + (p[3 * v + 2] as number), 0) / hem.length;
    const radius = median(
      hem.map((v) => Math.hypot((p[3 * v] as number) - cx, (p[3 * v + 2] as number) - cz)),
    );
    expect(radius).toBeGreaterThanOrEqual(1.5 * HIP_RADIUS_MM);
  });

  it('pend à sa longueur : ourlet au moins 0,8 fois la longueur de jupe sous le bas de ceinture', () => {
    if (!out.ok) throw new Error('drape failed');
    const final = out.positionsMm;
    const hemHeight = median(hemVertices().map((v) => final[3 * v + 1] as number));
    expect(hemHeight).toBeLessThanOrEqual(bandBottom(final) - 0.8 * SKIRT_LENGTH_MM);
  });

  it('est déterministe au bit près', () => {
    const again = drapeGarment(jobOf(spec, { avatar: ARMS }));
    if (!again.ok || !out.ok) throw new Error('drape failed');
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
    expect(again.result).toEqual(out.result);
  });

  it('coûte peu rapporté à la charge de référence (budget relatif)', () => {
    const ratio = costRatio(() => {
      drapeGarment(jobOf(spec, { avatar: ARMS }));
    });
    expect(ratio).toBeLessThan(30);
  });
});

// Bras à 9° (angle par défaut) : l'avant-bras traverse le volume de la jupe (mesuré : 13 à 16 mm au départ) ; un succès
// doit rester conforme, sinon un problème typé, jamais un faux succès.
describe('jupe cercle, bras à 9°', () => {
  it('rend un succès conforme ou un problème typé', async () => {
    await loadAvatarEngine();
    const out = drapeGarment(jobOf(spec, { avatar: { armAngleDeg: 9 } }));
    if (!out.ok) {
      expect(['seam-not-closed', 'body-penetration']).toContain(out.problem.type);
      return;
    }
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    expect(out.result.ease.minMm).toBeGreaterThanOrEqual(-3);
  });
});
