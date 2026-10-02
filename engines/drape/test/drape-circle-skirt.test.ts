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

// Jupe cercle en brouillon sur l'avatar (ADR 0013, 1.19e2a2). Mesures fictives des références, popeline.

const spec = fixture('circle-skirt');
const MAX_START_GAP_MM = 120;

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

describe('jupe cercle en brouillon sur l’avatar', () => {
  let avatar: AvatarShape;
  let out: DrapeOutcome;
  const mesh = meshGarment(spec, 'draft');

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, {});
    out = drapeGarment(jobOf(spec));
  });

  it('part avec toutes les coutures à moins de 120 mm (avant : 227 à 971 mm)', () => {
    const start = placeGarment(mesh, spec, avatar);
    expect(start.every(Number.isFinite)).toBe(true);
    expect(seamGaps(start, mesh.cloth.stitches)).toBeLessThan(MAX_START_GAP_MM);
  });

  it('ne rend jamais un faux succès : un succès respecte les critères, sinon un problème typé', () => {
    if (!out.ok) {
      expect(['seam-not-closed', 'body-penetration']).toContain(out.problem.type);
      return;
    }
    expect(out.result.converged).toBe(true);
    expect(out.result.simulatedSteps).toBeLessThanOrEqual(400);
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    const waist = avatar.landmarksMm.waist;
    const heights: number[] = [];
    for (const piece of mesh.pieces.filter((p) => p.panelId.startsWith('waistband'))) {
      for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
        if ((mesh.cloth.flatMm[2 * v + 1] as number) < 1e-6)
          heights.push(out.positionsMm[3 * v + 1] as number);
      }
    }
    heights.sort((a, b) => a - b);
    const bottom = heights[heights.length >> 1] as number;
    expect(bottom).toBeGreaterThanOrEqual(waist - 40);
    expect(bottom).toBeLessThanOrEqual(waist + 10);
  });

  // Critères de l'ADR pas encore tenus (mesures et hypothèse : compte rendu de 1.19e2a2 et page du composant) :
  // `ok`, `converged` en 400 pas, pénétration ≤ 3 mm, coutures ≤ 2 mm, bas de ceinture dans [waist − 40, waist + 10],
  // rayon de l'ourlet ≥ 1,5 fois celui de la hanche.
  it.todo('drape en succès : ok, convergé en 400 pas, sans pénétration ni couture ouverte');

  it('est déterministe au bit près', () => {
    const again = drapeGarment(jobOf(spec));
    expect(again.ok).toBe(out.ok);
    if (!again.ok || !out.ok) {
      expect(again).toEqual(out);
      return;
    }
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
    expect(again.result).toEqual(out.result);
  });

  it('coûte peu rapporté à la charge de référence (budget relatif)', () => {
    const ratio = costRatio(() => {
      drapeGarment(jobOf(spec));
    });
    expect(ratio).toBeLessThan(30);
  });
});
