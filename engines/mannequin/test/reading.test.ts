import { readFileSync } from 'node:fs';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as derive from '../src/core/derive.js';

// La lecture du corps est comptée : `fit` ne doit pas la payer, et chaque corps ne la paie qu'une fois.
vi.mock('../src/core/derive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof derive>();
  return { ...actual, readBody: vi.fn(actual.readBody) };
});

import {
  completeMeasurements,
  DERIVED_KEYS,
  deriveMeasurements,
  type FittedMannequin,
  loadMannequinEngine,
  type MannequinEngine,
  sideLandmarks,
} from '../src/index.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
const set: MeasurementSet = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 900,
  waistGirthMm: 720,
  hipGirthMm: 980,
};
const reads = (): number => vi.mocked(derive.readBody).mock.calls.length;

describe('lecture à la demande du corps ajusté', () => {
  let engine: MannequinEngine;
  let fitted: FittedMannequin;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(readFileSync(DATA)));
    fitted = engine.fit(set);
  });

  it('fit ne lit pas le corps', () => {
    expect(reads()).toBe(0);
  });

  it('la première demande lit le corps, les suivantes ne le relisent pas', () => {
    const landmarks = sideLandmarks(fitted);
    expect(reads()).toBe(1);
    expect(deriveMeasurements(fitted)).toBeDefined();
    expect(sideLandmarks(fitted)).toEqual(landmarks);
    expect(reads()).toBe(1);
  });

  it('un autre corps ajusté a sa propre lecture', () => {
    const before = reads();
    const other = engine.fit({ ...set, statureMm: 1750 });
    expect(reads()).toBe(before);
    expect(deriveMeasurements(other).kneeHeightMm).toBeGreaterThan(
      deriveMeasurements(fitted).kneeHeightMm,
    );
    expect(reads()).toBe(before + 1);
  });

  it("rend des objets neufs à chaque appel, propriété de l'appelant", () => {
    const first = sideLandmarks(fitted);
    first.left.acromion[0] = 0;
    expect(sideLandmarks(fitted).left.acromion[0]).toBeGreaterThan(0);
    const derived = deriveMeasurements(fitted);
    derived.kneeHeightMm = 0;
    expect(deriveMeasurements(fitted).kneeHeightMm).toBeGreaterThan(0);
  });

  it("signale un corps qui ne vient pas de fit (copie, doublure) au lieu d'inventer une lecture", () => {
    const copy: FittedMannequin = { ...fitted };
    expect(() => sideLandmarks(copy)).toThrow(/ne vient pas de `fit`/);
    expect(() => deriveMeasurements(copy)).toThrow(/ne vient pas de `fit`/);
  });
});

describe('completeMeasurements : la mesure fournie prime, le corps est lu au besoin', () => {
  let fitted: FittedMannequin;
  beforeAll(async () => {
    const engine = await loadMannequinEngine(async () => new Uint8Array(readFileSync(DATA)));
    fitted = engine.fit(set);
  });

  it('complète les mesures absentes avec celles du corps, sans toucher aux fournies', () => {
    const own: MeasurementSet = { ...set, kneeHeightMm: 455, shoulderSlopeDeg: 13 };
    const before = JSON.stringify(own);
    const completed = completeMeasurements(own, fitted);
    const derived = deriveMeasurements(fitted);
    expect(completed.kneeHeightMm).toBe(455);
    expect(completed.shoulderSlopeDeg).toBe(13);
    for (const key of DERIVED_KEYS) {
      if (key !== 'kneeHeightMm' && key !== 'shoulderSlopeDeg')
        expect(completed[key]).toBe(derived[key]);
    }
    expect(JSON.stringify(own)).toBe(before);
  });

  it('ne lit pas le corps quand les onze mesures sont fournies, même sans corps lisible', () => {
    const all = { ...set, ...deriveMeasurements(fitted) };
    const copy: FittedMannequin = { ...fitted };
    expect(completeMeasurements(all, copy)).toEqual(all);
  });

  it('lit le corps dès qu une mesure manque : une copie est alors une erreur', () => {
    const copy: FittedMannequin = { ...fitted };
    expect(() => completeMeasurements(set, copy)).toThrow(/ne vient pas de `fit`/);
  });
});
