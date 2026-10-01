import { describe, expect, it } from 'vitest';
import { simulate, type FabricPhysics } from '../src/index.js';
import { bendingWeights } from '../src/core/topology.js';
import { bendingLengthOverOverhang } from './elastica.js';
import { FABRIC, gridCloth, NO_BODY, SETTINGS } from './helpers.js';

const WEIGHT_G_PER_M2 = 120;
/** Poids par unité de surface, N/m². */
const WEIGHT_N_PER_M2 = (WEIGHT_G_PER_M2 / 1000) * 9.81;
const OVERHANG_MM = 40;
const EDGE_MM = 5;

/** Longueur de flexion (B/W)^(1/3), en mm, avec B en µN·m. */
export function bendingLengthMm(rigidityMicroNm: number): number {
  return Math.cbrt((rigidityMicroNm * 1e-6) / WEIGHT_N_PER_M2) * 1000;
}

/**
 * Porte-à-faux de 20 mm de large et 40 mm de long (deux colonnes fixes), maillage de 5 mm. Rend la longueur de
 * flexion déduite de l'angle de la pointe, par inversion de la solution exacte de l'élastique pesant (elastica.ts).
 */
export function cantileverBendingLengthMm(rigidityMicroNm: number): number {
  const fabric: FabricPhysics = {
    ...FABRIC,
    weightGPerM2: WEIGHT_G_PER_M2,
    stretchWarpPercent: 0.3,
    stretchWeftPercent: 0.3,
    bendingRigidityMicroNm: rigidityMicroNm,
  };
  const nx = OVERHANG_MM / EDGE_MM + 1;
  const ny = 4;
  const cloth = gridCloth({ nx, ny, edgeMm: EDGE_MM, place: (u, v) => [u, 0, v] });
  cloth.pinned = Uint32Array.from(
    { length: 2 * (ny + 1) },
    (_, k) => (k % 2) + Math.floor(k / 2) * (nx + 1),
  );
  const r = simulate(cloth, NO_BODY, fabric, { ...SETTINGS, substeps: 60, maxSteps: 150 });
  const at = (i: number, k: number): number => r.positionsMm[3 * (i + 2 * (nx + 1)) + k] as number; // rangée centrale (v = 10 mm)
  const theta = Math.atan2(at(nx - 1, 1) - at(nx, 1), at(nx, 0) - at(nx - 1, 0));
  return OVERHANG_MM * bendingLengthOverOverhang(theta);
}

describe('flexion isométrique', () => {
  it('les poids K annulent la somme K·x sur un état plat (4 sommets quelconques)', () => {
    const flat = Float64Array.from([0, 0, 10, 1, 4, 9, 6, -7]);
    const k = bendingWeights(flat, [0, 1, 2, 3]);
    for (let c = 0; c < 2; c++) {
      let sum = 0;
      for (let i = 0; i < 4; i++) sum += (k[i] as number) * (flat[2 * i + c] as number);
      expect(Math.abs(sum)).toBeLessThan(1e-12);
    }
    expect(k.reduce((s, v) => s + v, 0)).toBeCloseTo(0, 12);
  });
});

describe('simulate : porte-à-faux (40 × 20 mm)', () => {
  it('longueur de flexion (B/W)^(1/3) à 25 % près, croissante avec la rigidité', () => {
    const rigidities = [6, 12, 24];
    const measured = rigidities.map(cantileverBendingLengthMm);
    rigidities.forEach((b, i) => {
      const expected = bendingLengthMm(b);
      expect(Math.abs((measured[i] as number) - expected) / expected).toBeLessThan(0.25);
    });
    expect(measured[0] as number).toBeLessThan(measured[1] as number);
    expect(measured[1] as number).toBeLessThan(measured[2] as number);
  });
});
