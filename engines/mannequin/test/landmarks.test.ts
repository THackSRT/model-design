import { readFile } from 'node:fs/promises';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadMannequinEngine, type MannequinEngine, toMakeHumanMeasures } from '../src/index.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
/** Précision visée sur les tours (mm). */
const TOLERANCE_MM = 6;

const base: MeasurementSet = {
  sex: 'female',
  statureMm: 1700,
  chestGirthMm: 920,
  waistGirthMm: 740,
  hipGirthMm: 1000,
  thighGirthMm: 560,
  kneeGirthMm: 370,
};
const male: MeasurementSet = {
  sex: 'male',
  statureMm: 1800,
  chestGirthMm: 1020,
  waistGirthMm: 860,
  hipGirthMm: 1000,
};

describe('repères de hauteur', () => {
  let engine: MannequinEngine;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
  });

  it('convertit crotchHeightMm en cm', () => {
    expect(toMakeHumanMeasures({ ...base, crotchHeightMm: 780 }).crotch).toBe(78);
  });

  it.each([
    ['sans entrejambe demandé (femme)', base],
    ['sans entrejambe demandé (homme)', male],
    ['avec entrejambe', { ...base, crotchHeightMm: 780 }],
  ])('ordonne les repères (%s)', (_name, set) => {
    const l = engine.fit(set).landmarksMm;
    expect(l.ankle).toBeLessThan(l.knee);
    expect(l.knee).toBeLessThan(l.crotch);
    expect(l.crotch).toBeLessThan(l.hip);
    expect(l.hip).toBeLessThan(l.waist);
    expect(l.waist).toBeLessThan(l.neck);
    expect(l.neck).toBeLessThan(set.statureMm);
  });

  it("atteint la hauteur d'entrejambe demandée", () => {
    for (const target of [760, 780, 800, 820]) {
      const fitted = engine.fit({ ...base, crotchHeightMm: target });
      expect(Math.abs(fitted.landmarksMm.crotch - target)).toBeLessThan(1);
    }
  });

  it('deux cibles donnent deux entrejambes ordonnés dans le même sens', () => {
    const low = engine.fit({ ...base, crotchHeightMm: 760 }).landmarksMm.crotch;
    const high = engine.fit({ ...base, crotchHeightMm: 800 }).landmarksMm.crotch;
    expect(high - low).toBeGreaterThan(20);
  });

  it("garde les tours dans leur tolérance quand l'entrejambe est ajusté", () => {
    const fitted = engine.fit({ ...base, crotchHeightMm: 780 });
    for (const [key, target] of [
      ['chest', 920],
      ['waist', 740],
      ['hip', 1000],
      ['thigh', 560],
      ['knee', 370],
    ] as const) {
      expect(Math.abs((fitted.measuredMm[key] ?? 0) - target)).toBeLessThan(TOLERANCE_MM);
    }
  });
});

describe('bornes et propriété des tableaux', () => {
  let engine: MannequinEngine;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
  });

  it("borne l'entrejambe hors plage, sans erreur ni NaN", () => {
    const low = engine.fit({ ...base, crotchHeightMm: 600 });
    const high = engine.fit({ ...base, crotchHeightMm: 900 });
    for (const f of [low, high]) {
      expect(Object.values(f.landmarksMm).every(Number.isFinite)).toBe(true);
      expect(f.body.positions.every(Number.isFinite)).toBe(true);
    }
    expect(low.landmarksMm.crotch).toBeGreaterThan(650);
    expect(low.landmarksMm.crotch).toBeLessThan(high.landmarksMm.crotch);
    expect(high.landmarksMm.crotch).toBeLessThan(900);
  });

  it('rend des tableaux neufs à chaque ajustement', () => {
    const a = engine.fit(base);
    const b = engine.fit(base);
    const bufs = (f: typeof a): ArrayBufferLike[] => [
      f.body.positions.buffer,
      f.body.normals.buffer,
      f.body.index.buffer,
      (f.body as unknown as { uvs: Float32Array }).uvs.buffer,
    ];
    bufs(a).forEach((buf, i) => expect(buf).not.toBe(bufs(b)[i]));
    const before = Array.from(b.body.index.slice(0, 50));
    const uvs = (a.body as unknown as { uvs: Float32Array }).uvs;
    const uv0 = (b.body as unknown as { uvs: Float32Array }).uvs[5];
    a.body.index.fill(0);
    uvs.fill(9);
    structuredClone(a.body.positions, { transfer: [a.body.positions.buffer] });
    expect(Array.from(b.body.index.slice(0, 50))).toEqual(before);
    expect((b.body as unknown as { uvs: Float32Array }).uvs[5]).toBe(uv0);
    expect(b.body.positions.length).toBeGreaterThan(0);
  });
});
