import type { MeasurementSet } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import type { BodyReading, DerivedCm } from '../src/core/derive.js';
import {
  DERIVED_BOUNDS,
  DERIVED_KEYS,
  type DerivedMeasurements,
  fillMissing,
  toBodyLandmarksMm,
  toDerivedMeasurements,
} from '../src/derived.js';

/** Onze mesures plausibles, en cm et en degrés. */
const cm: DerivedCm = {
  highBustGirth: 90.04,
  upperHipGirth: 95.55,
  waistGirthBack: 38.2,
  hipGirthBack: 52,
  shoulderSlopeDeg: 22.4,
  waistToArmpit: 22.46,
  waistToUpperHip: 10.5,
  crotchLength: 68.01,
  frontCrotchLength: 33,
  waistToThigh: 30,
  kneeHeight: 48.5,
};

describe('conversion en mesures du contrat', () => {
  it('convertit les cm en mm entiers et laisse la pente en degrés entiers', () => {
    expect(toDerivedMeasurements(cm)).toEqual({
      highBustGirthMm: 900,
      upperHipGirthMm: 956,
      waistGirthBackMm: 382,
      hipGirthBackMm: 520,
      shoulderSlopeDeg: 22,
      waistToArmpitMm: 225,
      waistToUpperHipMm: 105,
      crotchLengthMm: 680,
      frontCrotchLengthMm: 330,
      waistToThighMm: 300,
      kneeHeightMm: 485,
    });
  });

  it('ramène une valeur lue hors des bornes du contrat à la borne', () => {
    const low = toDerivedMeasurements(
      Object.fromEntries(Object.keys(cm).map((k) => [k, 0])) as unknown as DerivedCm,
    );
    const high = toDerivedMeasurements(
      Object.fromEntries(Object.keys(cm).map((k) => [k, 1e4])) as unknown as DerivedCm,
    );
    for (const key of DERIVED_KEYS) {
      expect(low[key]).toBe(DERIVED_BOUNDS[key][0]);
      expect(high[key]).toBe(DERIVED_BOUNDS[key][1]);
    }
  });
});

describe('conversion des repères en mm', () => {
  it('multiplie chaque coordonnée par dix, côté gauche et côté droit', () => {
    const side = (s: number) => ({
      neckShoulder: [s * 6.1, 150.2, 0.5] as [number, number, number],
      acromion: [s * 19, 140, 1] as [number, number, number],
      armpit: [s * 16.5, 126, 2] as [number, number, number],
      iliacCrest: [s * 17.5, 98, 3.5] as [number, number, number],
    });
    const reading = { left: side(1), right: side(-1) } as unknown as BodyReading;
    const mm = toBodyLandmarksMm(reading);
    expect(mm.left.neckShoulderPoint).toEqual([61, 1502, 5]);
    expect(mm.right.neckShoulderPoint).toEqual([-61, 1502, 5]);
    expect(mm.left.iliacCrest).toEqual([175, 980, 35]);
    expect(mm.right.acromion).toEqual([-190, 1400, 10]);
    expect(mm.left.armpit).toEqual([165, 1260, 20]);
  });
});

describe('complétion par les mesures lues (fonction pure)', () => {
  const derived: DerivedMeasurements = {
    highBustGirthMm: 900,
    upperHipGirthMm: 950,
    waistGirthBackMm: 380,
    hipGirthBackMm: 520,
    shoulderSlopeDeg: 22,
    waistToArmpitMm: 220,
    waistToUpperHipMm: 105,
    crotchLengthMm: 680,
    frontCrotchLengthMm: 330,
    waistToThighMm: 300,
    kneeHeightMm: 480,
  };
  const provided: MeasurementSet = {
    sex: 'female',
    statureMm: 1700,
    chestGirthMm: 920,
    waistGirthMm: 740,
    hipGirthMm: 1000,
  };

  it('complète les mesures absentes avec les mesures lues', () => {
    expect(fillMissing(provided, derived)).toEqual({ ...provided, ...derived });
  });

  it('une mesure fournie prime toujours sur la mesure lue', () => {
    const own = { ...provided, kneeHeightMm: 455, shoulderSlopeDeg: 13, crotchLengthMm: 720 };
    const completed = fillMissing(own, derived);
    expect(completed.kneeHeightMm).toBe(455);
    expect(completed.shoulderSlopeDeg).toBe(13);
    expect(completed.crotchLengthMm).toBe(720);
    expect(completed.highBustGirthMm).toBe(900);
  });

  it('ne modifie pas le jeu fourni et traite une valeur absente comme une mesure manquante', () => {
    const own: MeasurementSet = { ...provided, waistToArmpitMm: undefined };
    const before = JSON.stringify(own);
    expect(fillMissing(own, derived).waistToArmpitMm).toBe(220);
    expect(JSON.stringify(own)).toBe(before);
  });
});
