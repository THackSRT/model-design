import { readFileSync } from 'node:fs';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DERIVED_BOUNDS,
  DERIVED_KEYS,
  type DerivedMeasurements,
  deriveMeasurements,
  type FitOptions,
  type FittedMannequin,
  loadMannequinEngine,
  type MannequinEngine,
  sideLandmarks,
  type SideLandmarksMm,
} from '../src/index.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);

const sets: [string, MeasurementSet][] = [
  [
    'femme',
    { sex: 'female', statureMm: 1700, chestGirthMm: 920, waistGirthMm: 740, hipGirthMm: 1000 },
  ],
  [
    'homme',
    { sex: 'male', statureMm: 1800, chestGirthMm: 1020, waistGirthMm: 860, hipGirthMm: 1000 },
  ],
  [
    'petite',
    { sex: 'female', statureMm: 1550, chestGirthMm: 860, waistGirthMm: 680, hipGirthMm: 940 },
  ],
];

const KEYS = ['neckShoulderPoint', 'acromion', 'armpit', 'iliacCrest'] as const;

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mesures plausibles d'un adulte (aucune mesure réelle : tirage de synthèse). */
function plausible(rnd: () => number): MeasurementSet {
  const between = (lo: number, hi: number): number => Math.round(lo + rnd() * (hi - lo));
  const female = rnd() < 0.5;
  const stature = female ? between(1500, 1850) : between(1600, 2000);
  const chest = Math.round(
    (female ? 840 : 920) * (0.8 + rnd() * 0.5) * (stature / (female ? 1650 : 1780)) ** 0.5,
  );
  return {
    sex: female ? 'female' : 'male',
    statureMm: stature,
    chestGirthMm: chest,
    waistGirthMm: Math.round(chest * (female ? 0.8 : 0.86) * (0.9 + rnd() * 0.25)),
    hipGirthMm: Math.round(chest * (female ? 1.08 : 1) * (0.95 + rnd() * 0.15)),
    // un cou sur deux seulement : sans lui, le cou du maillage n'est pas contraint
    ...(rnd() < 0.5
      ? { neckGirthMm: Math.round((female ? 330 : 380) * (0.85 + rnd() * 0.3)) }
      : {}),
  };
}

const apart = (a: SideLandmarksMm, b: SideLandmarksMm): number =>
  Math.max(
    ...KEYS.map((k) =>
      Math.max(
        Math.abs(a[k][0] + b[k][0]),
        Math.abs(a[k][1] - b[k][1]),
        Math.abs(a[k][2] - b[k][2]),
      ),
    ),
  );

/** Repères et mesures lus sur un corps ajusté par `fit`. */
function readOf(fitted: FittedMannequin): {
  left: SideLandmarksMm;
  right: SideLandmarksMm;
  derived: DerivedMeasurements;
} {
  return { ...sideLandmarks(fitted), derived: deriveMeasurements(fitted) };
}

/**
 * Symétrie, côtés et ordre vertical des repères. Le maillage n'est symétrique qu'à 0,2 mm près : sur un côté de
 * hanche presque plat, cela déplace le point de côté de quelques mm en z, d'où les 5 mm (comme `arms.test.ts`).
 */
function expectLandmarks(fitted: FittedMannequin): void {
  const { left, right } = readOf(fitted);
  const lm = fitted.landmarksMm;
  expect(apart(left, right)).toBeLessThan(5);
  for (const k of KEYS) {
    expect(left[k][0]).toBeGreaterThan(0);
    expect(right[k][0]).toBeLessThan(0);
  }
  // crête iliaque sous l'aisselle, sous l'acromion, sous le point d'encolure
  expect(lm.hip).toBeLessThan(left.iliacCrest[1]);
  expect(left.iliacCrest[1]).toBeLessThan(lm.waist);
  expect(left.iliacCrest[1]).toBeLessThan(left.armpit[1]);
  expect(left.armpit[1]).toBeLessThan(left.acromion[1]);
  expect(left.acromion[1]).toBeLessThan(left.neckShoulderPoint[1]);
  // l'acromion est au-delà du point d'encolure, et au-dessus du pivot de l'épaule
  expect(left.acromion[0]).toBeGreaterThan(left.neckShoulderPoint[0]);
  expect(left.acromion[1]).toBeGreaterThan(fitted.armsMm.left.shoulder[1]);
}

/** Mesures lues : entières, dans les bornes du contrat, cohérentes avec les repères de hauteur. */
function expectMeasures(fitted: FittedMannequin): void {
  const { left, right, derived } = readOf(fitted);
  const lm = fitted.landmarksMm;
  for (const key of DERIVED_KEYS) {
    const [min, max] = DERIVED_BOUNDS[key];
    expect(Number.isInteger(derived[key])).toBe(true);
    expect(derived[key]).toBeGreaterThanOrEqual(min);
    expect(derived[key]).toBeLessThanOrEqual(max);
  }
  expect(derived.kneeHeightMm).toBe(Math.round(lm.knee));
  expect(Math.abs(derived.waistToUpperHipMm - (lm.waist - lm.hip) / 2)).toBeLessThanOrEqual(1);
  const armpit = (left.armpit[1] + right.armpit[1]) / 2;
  expect(Math.abs(derived.waistToArmpitMm - (armpit - lm.waist))).toBeLessThanOrEqual(1);
  expect(derived.waistToThighMm).toBeGreaterThan(lm.waist - lm.crotch);
  expect(derived.waistToThighMm).toBeLessThan(lm.waist - lm.knee);
  expect(derived.shoulderSlopeDeg).toBeGreaterThanOrEqual(15);
  expect(derived.shoulderSlopeDeg).toBeLessThanOrEqual(32);
}

/** Tours et fourche : fourche d'au moins 1,8 fois la hauteur taille-entrejambe, parts dos autour de la moitié. */
function expectGirths(fitted: FittedMannequin): void {
  const { derived } = readOf(fitted);
  const lm = fitted.landmarksMm;
  const m = fitted.measuredMm;
  // l'entrejambe du moteur est le plus bas sommet près du milieu, un peu sous l'arche du plan sagittal
  expect(derived.crotchLengthMm).toBeGreaterThan(1.8 * (lm.waist - lm.crotch));
  const front = derived.frontCrotchLengthMm / derived.crotchLengthMm;
  expect(front).toBeGreaterThan(0.4);
  expect(front).toBeLessThan(0.58);
  // hanches hautes : dans la fourchette des tours de taille et de bassin (la taille peut dépasser le bassin)
  const [low, high] = [
    Math.min(m['waist'] ?? 0, m['hip'] ?? 0),
    Math.max(m['waist'] ?? 0, m['hip'] ?? 0),
  ];
  expect(derived.upperHipGirthMm).toBeGreaterThan(0.95 * low);
  expect(derived.upperHipGirthMm).toBeLessThan(1.06 * high);
  expect(derived.waistGirthBackMm / (m['waist'] ?? 1)).toBeGreaterThan(0.38);
  expect(derived.waistGirthBackMm / (m['waist'] ?? 1)).toBeLessThan(0.58);
  expect(derived.hipGirthBackMm / (m['hip'] ?? 1)).toBeGreaterThan(0.42);
  expect(derived.hipGirthBackMm / (m['hip'] ?? 1)).toBeLessThan(0.62);
}

const expectCoherent = (fitted: FittedMannequin): void => {
  expectLandmarks(fitted);
  expectMeasures(fitted);
  expectGirths(fitted);
};

describe('repères du corps et mesures lues', () => {
  let engine: MannequinEngine;
  const fits = new Map<string, FittedMannequin>();
  /** Un ajustement coûte environ une demi-seconde : ceux qui se répètent d'un test à l'autre sont gardés. */
  const fitOf = (set: MeasurementSet, options?: FitOptions): FittedMannequin => {
    const key = JSON.stringify([set, options]);
    let fitted = fits.get(key);
    if (!fitted) {
      fitted = engine.fit(set, options);
      fits.set(key, fitted);
    }
    return fitted;
  };
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(readFileSync(DATA)));
  });

  it.each(sets)(
    'symétrie à 5 mm près, ordre vertical et cohérence des mesures (%s)',
    (_name, set) => {
      expectCoherent(fitOf(set));
    },
  );

  it('ne dépend pas de l’angle des bras : lus sur le corps au repos', () => {
    const [, set] = sets[0] as [string, MeasurementSet];
    const down = readOf(fitOf(set, { armAngleDeg: 0 }));
    const raised = readOf(fitOf(set, { armAngleDeg: 90 }));
    expect(raised).toEqual(down);
  });

  it('est déterministe', () => {
    const [, set] = sets[1] as [string, MeasurementSet];
    expect(readOf(engine.fit(set))).toEqual(readOf(engine.fit(set)));
  });

  it('un corps plus grand donne des repères plus hauts et plus larges', () => {
    const [, small] = sets[2] as [string, MeasurementSet];
    const [, tall] = sets[0] as [string, MeasurementSet];
    const a = readOf(fitOf(small));
    const b = readOf(fitOf(tall));
    for (const k of KEYS) expect(b.left[k][1]).toBeGreaterThan(a.left[k][1]);
    expect(b.derived.kneeHeightMm).toBeGreaterThan(a.derived.kneeHeightMm);
    expect(b.derived.crotchLengthMm).toBeGreaterThan(a.derived.crotchLengthMm);
  });

  it('tient sur des mesures plausibles tirées au hasard (graine fixe)', () => {
    const rnd = seeded(20261005);
    for (let i = 0; i < 6; i++) {
      const set = plausible(rnd);
      expectCoherent(fitOf(set, { age: 20 + Math.round(rnd() * 40) }));
    }
  });
});
