import { describe, expect, it } from 'vitest';
import {
  FABRIC_PRESETS,
  buildCusickTest,
  drapeCoefficient,
  projectedAreaMm2,
  runCusickTest,
  shadowOutlineMm,
  simulate,
  type CusickEdgeMm,
} from '../src/index.js';
import { FABRIC, cpuSeconds, sameBits } from './helpers.js';

const edges: CusickEdgeMm[] = [5, 7.5, 10, 15];

describe('maillage de Cusick', () => {
  it.each(edges)('anneaux, aire et sommets fixes à %s mm', (edgeMm) => {
    const t = buildCusickTest(FABRIC, { edgeMm });
    const K = 150 / edgeMm;
    const n = t.cloth.flatMm.length / 2;
    expect(n).toBe(1 + 3 * K * (K + 1));
    expect(t.cloth.triangles.length / 3).toBe(6 * K * K);
    const ratio = t.specimenAreaMm2 / (Math.PI * 150 ** 2);
    expect(ratio).toBeGreaterThanOrEqual(edgeMm === 15 ? 0.998 : 0.999);
    const expected: number[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(t.cloth.flatMm[2 * i] as number, t.cloth.flatMm[2 * i + 1] as number);
      if (r <= 90 + 1e-6) expected.push(i);
    }
    expect(Array.from(t.cloth.pinned ?? [])).toEqual(expected);
  });

  it('1 261 sommets à 7,5 mm et passe la validation de simulate()', () => {
    const t = buildCusickTest(FABRIC);
    expect(t.cloth.flatMm.length / 2).toBe(1261);
    expect(() => simulate(t.cloth, t.body, FABRIC, { ...t.settings, maxSteps: 1 })).not.toThrow();
  });
});

describe('projectedAreaMm2', () => {
  it('carré de 100 mm', () => {
    const pos = Float64Array.from([0, 0, 0, 100, 0, 0, 100, 0, 100, 0, 0, 100]);
    const tris = Uint32Array.from([0, 1, 2, 0, 2, 3]);
    expect(Math.abs(projectedAreaMm2(pos, tris) / 10000 - 1)).toBeLessThan(0.005);
  });

  it('disque à plat', () => {
    const t = buildCusickTest(FABRIC, { edgeMm: 10 });
    const area = projectedAreaMm2(t.cloth.positionsMm, t.cloth.triangles);
    expect(Math.abs(area / t.specimenAreaMm2 - 1)).toBeLessThan(0.005);
  });

  it('deux triangles superposés comptés une fois', () => {
    const pos = Float64Array.from([0, 0, 0, 50, 5, 0, 0, 9, 50]);
    const once = projectedAreaMm2(pos, Uint32Array.from([0, 1, 2]));
    expect(projectedAreaMm2(pos, Uint32Array.from([0, 1, 2, 2, 1, 0]))).toBe(once);
    expect(Math.abs(once / 1250 - 1)).toBeLessThan(0.03);
  });
});

describe('drapeCoefficient et contour', () => {
  it('borne à [0, 1] et arrondit au millième', () => {
    expect(drapeCoefficient(0, 100, 10)).toBe(0);
    expect(drapeCoefficient(500, 100, 10)).toBe(1);
    expect(drapeCoefficient(40, 100, 10)).toBe(0.333);
  });

  it('contour : rayon maximal par secteur, secteur vide comblé', () => {
    const pos = Float64Array.from([10, 0, 0, 0, 0, 20, -5, 0, 0]);
    const o = shadowOutlineMm(pos, 4);
    expect(o).toHaveLength(8);
    const radii = Array.from({ length: 4 }, (_, s) =>
      Math.hypot(o[2 * s] as number, o[2 * s + 1] as number),
    );
    expect(radii.every((r) => r > 0)).toBe(true);
    expect(Math.max(...radii)).toBeCloseTo(20, 9);
  });
});

describe('essai de Cusick', () => {
  it('sans pas de simulation, l’éprouvette est à plat : DC >= 0,99', () => {
    const r = runCusickTest(FABRIC, { edgeMm: 10, maxSteps: 0 });
    expect(r.drapeCoefficient).toBeGreaterThanOrEqual(0.99);
    expect(r.simulatedSteps).toBe(0);
  });

  it('DC croît avec la rigidité de flexion', () => {
    const dc = [2, 20, 200].map(
      (b) =>
        runCusickTest({ ...FABRIC, bendingRigidityMicroNm: b }, { edgeMm: 10 }).drapeCoefficient,
    );
    expect(dc[0]).toBeLessThan(dc[1] as number);
    expect(dc[1]).toBeLessThan(dc[2] as number);
    dc.forEach((d) => expect(d >= 0 && d <= 1).toBe(true));
  });

  it('ordre silk-satin < cotton-poplin < denim', () => {
    const dc = (name: 'silk-satin' | 'cotton-poplin' | 'denim'): number =>
      runCusickTest(FABRIC_PRESETS[name], { edgeMm: 10 }).drapeCoefficient;
    expect(dc('silk-satin')).toBeLessThan(dc('cotton-poplin'));
    expect(dc('cotton-poplin')).toBeLessThan(dc('denim'));
  });

  it('déterministe au bit près', () => {
    const a = runCusickTest(FABRIC, { edgeMm: 15 });
    const b = runCusickTest(FABRIC, { edgeMm: 15 });
    expect(a.drapeCoefficient).toBe(b.drapeCoefficient);
    expect(sameBits(a.outlineMm, b.outlineMm)).toBe(true);
  });

  it('performance : 10 mm en moins de 5 s', () => {
    // Temps CPU, pas d'horloge murale (voir `cpuSeconds`).
    expect(cpuSeconds(() => void runCusickTest(FABRIC, { edgeMm: 10 }))).toBeLessThan(5);
  });
});
