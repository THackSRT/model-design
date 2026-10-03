import { beforeAll, describe, expect, it } from 'vitest';
import type { GarmentSpec } from '@atelier/contracts-ts';
import {
  buildAvatar,
  drapeGarment,
  loadAvatarEngine,
  placeGarment,
  type AvatarShape,
  type DrapeOutcome,
} from '../src/node.js';
import { meshGarment, PENETRATION_TOLERANCE_MM, SEAM_TOLERANCE_MM } from '../src/index.js';
import { garmentHolds } from '../src/placement/holds.js';
import { costRatio } from './helpers.js';
import { fixture, jobOf, MEASUREMENTS } from './drape-helpers.js';

// Corsage et corsage à manches en brouillon sur l'avatar, bras à 30° (ADR 0013, 1.19e2c). Mesures fictives, popeline.

const MAX_SHOULDER_GAP_MM = 80;
const ARMS = { armAngleDeg: 30 };
const FLAT_EASE_MM = 3;

interface Case {
  name: string;
  spec: GarmentSpec;
}

/** Plus grand écart des coutures dont les sommets sont sur un bord nommé `shoulder`. */
function shoulderGap(spec: GarmentSpec, positions: ArrayLike<number>): number {
  const mesh = meshGarment(spec, 'draft');
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

const cases: Case[] = [
  { name: 'corsage', spec: fixture('bodice') },
  { name: 'corsage à manches', spec: fixture('bodice-with-sleeves') },
];

describe.each(cases)('$name en brouillon, bras à 30°', ({ spec }) => {
  let avatar: AvatarShape;

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, ARMS);
  });

  it('part avec les coutures d’épaule à moins de 80 mm (avant : 257 à 283 mm)', () => {
    const start = placeGarment(meshGarment(spec, 'draft'), spec, avatar);
    expect(start.every(Number.isFinite)).toBe(true);
    expect(shoulderGap(spec, start)).toBeLessThan(MAX_SHOULDER_GAP_MM);
  });

  it('tient les coutures d’épaule en hauteur pendant la couture', () => {
    const mesh = meshGarment(spec, 'draft');
    const start = placeGarment(mesh, spec, avatar);
    const holds = garmentHolds(mesh, spec, avatar, start);
    const tagged = new Set<number>();
    holds?.vertices.forEach((v, i) => {
      if (holds.axes[3 * i + 1] === 1) tagged.add(v);
    });
    const high = [...tagged].filter(
      (v) => (start[3 * v + 1] as number) >= avatar.landmarksMm.shoulder - 30,
    );
    expect(high.length).toBeGreaterThan(10);
  });
});

describe('corsage', () => {
  const spec = fixture('bodice');
  let avatar: AvatarShape;
  let out: DrapeOutcome;

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, ARMS);
    out = drapeGarment(jobOf(spec, { avatar: ARMS }));
  });

  it('drape en succès : convergé en 400 pas, sans pénétration ni couture ouverte', () => {
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.converged).toBe(true);
    expect(out.result.simulatedSteps).toBeLessThanOrEqual(400);
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    expect(out.result.ease.minMm).toBeGreaterThanOrEqual(-FLAT_EASE_MM);
  });

  it('finit avec les épaules entre shoulder − 20 et neck + 20 mm', () => {
    if (!out.ok) throw new Error('drape failed');
    const heights = edgeHeights(spec, out, 'shoulder');
    expect(heights.length).toBeGreaterThan(10);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(avatar.landmarksMm.shoulder - 20);
    expect(Math.max(...heights)).toBeLessThanOrEqual(avatar.landmarksMm.neck + 20);
  });

  it('finit avec le bas à waist ± 40 mm (médiane des sommets d’ourlet)', () => {
    if (!out.ok) throw new Error('drape failed');
    const heights = edgeHeights(spec, out, 'hem-1', 'hem-2').sort((a, b) => a - b);
    const median = heights[heights.length >> 1] as number;
    expect(Math.abs(median - avatar.landmarksMm.waist)).toBeLessThanOrEqual(40);
  });

  // Un seul drapé supplémentaire : budget de coût et, comparé au premier, déterminisme au bit près.
  it('est déterministe au bit près et coûte peu rapporté à la charge de référence (budget relatif)', () => {
    let again: DrapeOutcome | undefined;
    const ratio = costRatio(() => {
      again = drapeGarment(jobOf(spec, { avatar: ARMS }));
    });
    expect(ratio).toBeLessThan(20);
    if (!again?.ok || !out.ok) throw new Error('drape failed');
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
  });
});

/** Hauteurs finales des sommets des bords nommés `edgeIds`. */
function edgeHeights(spec: GarmentSpec, out: DrapeOutcome, ...edgeIds: string[]): number[] {
  if (!out.ok) return [];
  const panels = new Map(spec.panels.map((p) => [p.id, p]));
  const found: number[] = [];
  for (const piece of out.mesh.pieces) {
    for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
      const edge = out.mesh.vertexEdge[v] as number;
      const id = edge >= 0 ? panels.get(piece.panelId)?.edges[edge]?.id : undefined;
      if (id !== undefined && edgeIds.includes(id))
        found.push(out.positionsMm[3 * v + 1] as number);
    }
  }
  return found;
}

describe('corsage à manches', () => {
  const spec = fixture('bodice-with-sleeves');
  let avatar: AvatarShape;
  let out: DrapeOutcome;

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, ARMS);
    out = drapeGarment(jobOf(spec, { avatar: ARMS }));
  });

  it('tient le haut de manche sur l’axe du bras (axe = −axe du bras, cible = position de départ)', () => {
    const mesh = meshGarment(spec, 'draft');
    const start = placeGarment(mesh, spec, avatar);
    const holds = garmentHolds(mesh, spec, avatar, start);
    const sleeve = mesh.pieces.filter((p) => p.panelId === 'sleeve');
    expect(sleeve.length).toBe(2);
    let held = 0;
    holds?.vertices.forEach((v, i) => {
      const piece = sleeve.find((p) => v >= p.vertexStart && v < p.vertexStart + p.vertexCount);
      if (!piece || (piece.side !== 'left' && piece.side !== 'right')) return;
      held++;
      const axis = avatar.arms[piece.side].axis;
      expect(holds.axes[3 * i]).toBeCloseTo(-axis[0], 12);
      expect(holds.axes[3 * i + 1]).toBeCloseTo(-axis[1], 12);
      const along = -(
        axis[0] * (start[3 * v] as number) +
        axis[1] * (start[3 * v + 1] as number) +
        axis[2] * (start[3 * v + 2] as number)
      );
      expect(holds.targetsMm[i]).toBeCloseTo(along, 9);
    });
    expect(held).toBeGreaterThan(10);
  });

  // Mesuré : la manche du patron a 188 mm de large à 143 mm sous l’épaule, le bras 232 mm de tour à ce niveau (avant
  // toute aisance) ; elle ne peut pas l’entourer, et l’emmanchure du corsage (285 mm) est plus courte que le trou
  // du bras : le drapé rend `body-penetration` (≈ 28 mm au creux du dos). Garde-fou : un succès doit être conforme,
  // sinon un problème typé.
  it('rend un succès conforme ou un problème typé, jamais un faux succès', () => {
    if (!out.ok) {
      expect(['seam-not-closed', 'body-penetration']).toContain(out.problem.type);
      return;
    }
    expect(out.result.converged).toBe(true);
    expect(out.result.simulatedSteps).toBeLessThanOrEqual(400);
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    expect(out.result.ease.minMm).toBeGreaterThanOrEqual(-FLAT_EASE_MM);
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
    expect(Math.abs(top)).toBeLessThan(40);
  });

  it('est déterministe au bit près et coûte peu rapporté à la charge de référence (budget relatif)', () => {
    let again: DrapeOutcome | undefined;
    const ratio = costRatio(() => {
      again = drapeGarment(jobOf(spec, { avatar: ARMS }));
    });
    expect(ratio).toBeLessThan(20);
    expect(again?.ok).toBe(out.ok);
    if (!again?.ok || !out.ok) {
      expect(again).toEqual(out);
      return;
    }
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
  });
});

// Bras à 9° (angle par défaut) : le bras touche le flanc ; un succès doit rester conforme (aucune aisance sous −3 mm),
// sinon un problème typé.
describe.each(cases)('$name, bras à 9°', ({ spec }) => {
  it('rend un succès sans pénétration ou un problème typé', async () => {
    await loadAvatarEngine();
    const out = drapeGarment(jobOf(spec, { avatar: { armAngleDeg: 9 } }));
    if (!out.ok) {
      expect(['seam-not-closed', 'body-penetration']).toContain(out.problem.type);
      return;
    }
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    expect(out.result.ease.minMm).toBeGreaterThanOrEqual(-FLAT_EASE_MM);
  });
});
