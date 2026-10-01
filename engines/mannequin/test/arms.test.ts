import { readFile } from 'node:fs/promises';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadMannequinEngine, type MannequinEngine } from '../src/index.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);

const FEMALE: MeasurementSet = {
  sex: 'female',
  statureMm: 1700,
  chestGirthMm: 920,
  waistGirthMm: 740,
  hipGirthMm: 1000,
};
const MALE: MeasurementSet = {
  sex: 'male',
  statureMm: 1800,
  chestGirthMm: 1020,
  waistGirthMm: 860,
  hipGirthMm: 1000,
};
const sets: [string, MeasurementSet][] = [
  [
    'femme',
    {
      sex: 'female',
      statureMm: 1700,
      chestGirthMm: 920,
      waistGirthMm: 740,
      hipGirthMm: 1000,
    },
  ],
  [
    'homme',
    {
      sex: 'male',
      statureMm: 1800,
      chestGirthMm: 1020,
      waistGirthMm: 860,
      hipGirthMm: 1000,
    },
  ],
  [
    'petite',
    {
      sex: 'female',
      statureMm: 1550,
      chestGirthMm: 860,
      waistGirthMm: 680,
      hipGirthMm: 940,
    },
  ],
];

const angleFromVerticalDeg = (axis: number[]): number =>
  (Math.acos(-(axis[1] as number)) * 180) / Math.PI;

describe('repères des bras', () => {
  let engine: MannequinEngine;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
  });

  it.each(sets)('épaule au-dessus du poignet, gauche à x > 0 (%s)', (_n, m) => {
    const { armsMm } = engine.fit(m);
    for (const arm of [armsMm.left, armsMm.right]) {
      expect(arm.shoulder[1]).toBeGreaterThan(arm.wrist[1] + 300);
      expect(arm.axis[1]).toBeLessThan(0);
    }
    expect(armsMm.left.shoulder[0]).toBeGreaterThan(0);
    expect(armsMm.left.wrist[0]).toBeGreaterThan(0);
    expect(armsMm.right.shoulder[0]).toBeLessThan(0);
    expect(armsMm.right.wrist[0]).toBeLessThan(0);
  });

  it.each(sets)('symétrie gauche/droite à 5 mm près (%s)', (_n, m) => {
    const { left, right } = engine.fit(m).armsMm;
    expect(Math.abs(left.shoulder[0] + right.shoulder[0])).toBeLessThan(5);
    expect(Math.abs(left.shoulder[1] - right.shoulder[1])).toBeLessThan(5);
    expect(Math.abs(left.wrist[0] + right.wrist[0])).toBeLessThan(5);
    expect(Math.abs(left.wrist[1] - right.wrist[1])).toBeLessThan(5);
    expect(Math.abs(left.lengthMm - right.lengthMm)).toBeLessThan(5);
  });

  it.each(sets)('longueur épaule-poignet cohérente avec la stature (%s)', (_n, m) => {
    const { armsMm } = engine.fit(m);
    for (const arm of [armsMm.left, armsMm.right]) {
      expect(arm.lengthMm / m.statureMm).toBeGreaterThan(0.24);
      expect(arm.lengthMm / m.statureMm).toBeLessThan(0.4);
      expect(Math.hypot(...arm.axis)).toBeCloseTo(1, 6);
    }
  });

  it('expose shoulder et wrist dans landmarksMm, entre cou et taille', () => {
    const { landmarksMm: lm, armsMm } = engine.fit(FEMALE);
    expect(lm.shoulder).toBe(armsMm.left.shoulder[1]);
    expect(lm.shoulder).toBeLessThan(lm.neck + 100);
    expect(lm.shoulder).toBeGreaterThan(lm.waist);
    expect(lm.wrist).toBeLessThan(lm.waist);
    expect(lm.wrist).toBeGreaterThan(lm.crotch - 300);
  });

  it("l'axe suit l'angle de pose", () => {
    const m = FEMALE;
    const a9 = engine.fit(m, { armAngleDeg: 9 }).armsMm;
    const a30 = engine.fit(m, { armAngleDeg: 30 }).armsMm;
    for (const side of ['left', 'right'] as const) {
      const d9 = angleFromVerticalDeg(a9[side].axis);
      const d30 = angleFromVerticalDeg(a30[side].axis);
      expect(d9).toBeGreaterThan(5);
      expect(d9).toBeLessThan(13);
      expect(d30 - d9).toBeGreaterThan(18);
      expect(d30 - d9).toBeLessThan(24);
    }
    expect(a30.left.wrist[0]).toBeGreaterThan(a9.left.wrist[0]);
  });

  it('est déterministe', () => {
    const m = MALE;
    expect(engine.fit(m).armsMm).toEqual(engine.fit(m).armsMm);
  });
});
