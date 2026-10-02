import { describe, expect, it } from 'vitest';
import { simulate, type FabricPhysics } from '../src/index.js';
import {
  FABRIC,
  gridCloth,
  hexStripCloth,
  NO_BODY,
  sameBits,
  SETTINGS,
  sphereBody,
  type Vec3,
} from './helpers.js';

const G = 9810;
const flatPlace =
  (height: number) =>
  (u: number, v: number): Vec3 => [u, height, v];

describe('simulate : déterminisme et chute libre', () => {
  it('rend la même sortie au bit près à deux exécutions', () => {
    const cloth = gridCloth({ nx: 12, ny: 12, edgeMm: 10, place: flatPlace(150) });
    const body = sphereBody([60, 0, 60], 70);
    const a = simulate(cloth, body, FABRIC, { ...SETTINGS, maxSteps: 40 });
    const b = simulate(cloth, body, FABRIC, { ...SETTINGS, maxSteps: 40 });
    expect(sameBits(a.positionsMm, b.positionsMm)).toBe(true);
    expect(a.steps).toBe(b.steps);
  });

  it('tombe de ½·g·t² à 1 % près sans corps', () => {
    const cloth = gridCloth({ nx: 8, ny: 8, edgeMm: 10, place: flatPlace(0) });
    const settings = { ...SETTINGS, maxSteps: 30 };
    const result = simulate(cloth, NO_BODY, FABRIC, settings);
    const t = settings.maxSteps * settings.stepS;
    const expected = 0.5 * G * t * t;
    for (let v = 0; v < result.positionsMm.length / 3; v++) {
      const fall = -(result.positionsMm[3 * v + 1] as number);
      expect(Math.abs(fall - expected) / expected).toBeLessThan(0.01);
    }
  });
});

/**
 * Bande suspendue par son bord haut, de poids réparti tel que la tension en haut soit celle de l'essai de
 * référence (10 N sur 50 mm : 0,2 N/mm). Rend l'allongement mesuré entre le sommet 12 et le bas, et celui attendu
 * (hors zone d'encastrement) : ∫ ε·h/L dh sur la partie basse.
 */
function hangingStrip(
  grain: readonly [number, number],
  warp: number,
  weft: number,
  substeps: number,
) {
  const rows = 40;
  const edgeMm = 500 / ((rows * Math.sqrt(3)) / 2);
  const fabric: FabricPhysics = {
    ...FABRIC,
    weightGPerM2: 40775, // 0,2 N/mm × 1 mm / 500 mm = 4e-4 N/mm² = 40 775 g/m²
    stretchWarpPercent: warp,
    stretchWeftPercent: weft,
    bendingRigidityMicroNm: 1,
  };
  const cloth = hexStripCloth({ cols: 4, rows, edgeMm, place: (u, v) => [u, 500 - v, 0], grain });
  cloth.pinned = Uint32Array.from({ length: 4 }, (_, i) => i);
  const r = simulate(cloth, NO_BODY, fabric, { ...SETTINGS, substeps, maxSteps: 240 });
  const y = (j: number): number => r.positionsMm[3 * (4 * j) + 1] as number;
  return { measured: y(8) - y(rows) - ((rows - 8) * edgeMm * Math.sqrt(3)) / 2, y };
}

describe('simulate : étirement', () => {
  // Allongement de la partie basse (400 mm sur 500) sous un poids réparti : ε · 400² / (2 · 500), ε déclaré à 10 N.
  const expectedMm = (percent: number): number => (percent / 100) * 160;

  it.each([
    ['chaîne : droit fil le long de la bande', [0, 1] as const, 4],
    ['trame : droit fil en travers de la bande', [1, 0] as const, 5],
  ])('bande suspendue, %s : allongement déclaré à 15 %% près', (_name, grain, declaredPercent) => {
    const { measured } = hangingStrip(grain, 4, 5, 40);
    const expected = expectedMm(declaredPercent);
    expect(Math.abs(measured - expected) / expected).toBeLessThan(0.15);
  });
});
