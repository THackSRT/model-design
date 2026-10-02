import { readFile } from 'node:fs/promises';
import { dressMannequin, loadMannequinEngine, type FittedMannequin } from '@atelier/mannequin';
import { beforeAll, describe, expect, it } from 'vitest';
import { drapeGarment, loadAvatarEngine, type DrapeSuccess } from '../src/node.js';
import { ENGINE_VERSION, PENETRATION_TOLERANCE_MM, SEAM_TOLERANCE_MM } from '../src/index.js';
import { costRatio } from './helpers.js';
import { fixture, jobOf, MEASUREMENTS } from './drape-helpers.js';

const spec = fixture('straight-skirt');

function success(out: ReturnType<typeof drapeGarment>): DrapeSuccess {
  if (!out.ok) throw new Error(`drape failed: ${out.problem.type}`);
  return out;
}

describe('drapé de la jupe droite en brouillon sur l’avatar', () => {
  let out: DrapeSuccess;
  beforeAll(async () => {
    await loadAvatarEngine();
    out = success(drapeGarment(jobOf(spec)));
  });

  it('converge, sans pénétration ni couture ouverte', () => {
    expect(out.result.converged).toBe(true);
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    expect(out.result.simulatedSteps).toBeGreaterThan(10);
  });

  it('rend des tableaux alignés sur les sommets et un résumé conforme au contrat', () => {
    const n = out.mesh.cloth.flatMm.length / 2;
    expect(out.result.vertexCount).toBe(n);
    expect(out.positionsMm.length).toBe(3 * n);
    expect(out.easeMm.length).toBe(n);
    expect(out.strain.length).toBe(n);
    expect(out.result.engineVersion).toBe(ENGINE_VERSION);
    const e = out.result.ease;
    expect(e.minMm).toBeLessThanOrEqual(e.medianMm);
    expect(e.medianMm).toBeLessThanOrEqual(e.maxMm);
    expect(e.tightAreaMm2).toBeGreaterThan(0);
    expect(Number.isFinite(out.result.maxStrainPercent)).toBe(true);
    expect(out.positionsMm.every(Number.isFinite)).toBe(true);
  });

  it('a une aisance au bassin du même ordre que celle du patron', () => {
    // Patron : tour fini au bassin ≈ 983 mm pour 960 mm de corps, soit ≈ 4 mm d'écart radial ; on exige l'ordre de
    // grandeur (0 à 25 mm) pour l'écart médian des sommets à la hauteur du bassin.
    const hip = 826;
    const ease: number[] = [];
    for (let v = 0; v < out.easeMm.length; v++) {
      if (Math.abs((out.positionsMm[3 * v + 1] as number) - hip) < 15)
        ease.push(out.easeMm[v] as number);
    }
    ease.sort((a, b) => a - b);
    const median = ease[ease.length >> 1] as number;
    expect(ease.length).toBeGreaterThan(20);
    expect(median).toBeGreaterThanOrEqual(0);
    expect(median).toBeLessThan(25);
  });

  it('est déterministe : mêmes bits', () => {
    const again = success(drapeGarment(jobOf(spec)));
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
    expect(again.result).toEqual(out.result);
  });

  it('respecte le nombre de pas maximal demandé', () => {
    const short = success(drapeGarment(jobOf(spec), { maxSteps: 12 }));
    expect(short.result.simulatedSteps).toBe(12);
    expect(short.result.converged).toBe(false);
  });

  it('signale fabricEstimated pour un préréglage estimé, pas si tout est surchargé', () => {
    expect(out.result.fabricEstimated).toBe(true);
    const all = success(
      drapeGarment(
        jobOf(spec, {
          fabric: {
            preset: 'cotton-poplin',
            weightGPerM2: 120,
            thicknessMm: 0.2,
            stretchWarpPercent: 2,
            stretchWeftPercent: 3,
            bendingRigidityMicroNm: 6,
            frictionCoefficient: 0.35,
          },
        }),
        { maxSteps: 5 },
      ),
    );
    expect(all.result.fabricEstimated).toBe(false);
  });

  it('coûte peu rapporté à la charge de référence (budget relatif)', () => {
    // Mesuré au repos : voir AGENTS.md du moteur ; seuil ≈ ×2.
    const ratio = costRatio(() => {
      success(drapeGarment(jobOf(spec)));
    });
    expect(ratio).toBeLessThan(RATIO_LIMIT);
  });
});

const RATIO_LIMIT = 20;

describe('cohérence avec l’habillage géométrique 1.34a', () => {
  it('reste à moins de 50 mm en moyenne des sommets de l’habillage rapide', async () => {
    await loadAvatarEngine();
    const engine = await loadMannequinEngine(
      async () =>
        new Uint8Array(
          await readFile(new URL('../../mannequin/assets/makehuman.mhz', import.meta.url)),
        ),
    );
    const fitted: FittedMannequin = engine.fit(MEASUREMENTS, {});
    const dress = dressMannequin(fitted, spec, { type: 'straight-skirt' });
    const drape = success(drapeGarment(jobOf(spec)));
    let sum = 0;
    const n = drape.positionsMm.length / 3;
    for (let v = 0; v < n; v++) {
      let best = Infinity;
      for (let d = 0; d < dress.positions.length; d += 3) {
        const dx = (dress.positions[d] as number) * 10 - (drape.positionsMm[3 * v] as number);
        const dy =
          (dress.positions[d + 1] as number) * 10 - (drape.positionsMm[3 * v + 1] as number);
        const dz =
          (dress.positions[d + 2] as number) * 10 - (drape.positionsMm[3 * v + 2] as number);
        best = Math.min(best, dx * dx + dy * dy + dz * dz);
      }
      sum += Math.sqrt(best);
    }
    expect(sum / n).toBeLessThan(50);
  });
});
