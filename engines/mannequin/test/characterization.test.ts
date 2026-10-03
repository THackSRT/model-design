import { readFile } from 'node:fs/promises';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadMannequinEngine, type MannequinEngine } from '../src/index.js';

/*
 * Test de caractérisation : fige la sortie du moteur (mesures fictives) pour garantir que le
 * découpage de l'ancien makehuman.js n'a changé aucun comportement (ADR 0004).
 */
const DATA = new URL('../assets/makehuman.mhz', import.meta.url);

const CASES: {
  name: string;
  set: MeasurementSet;
  options?: { age?: number; morphotype?: { african: number; asian: number; caucasian: number } };
  expected: Fingerprint;
}[] = [];

interface Fingerprint {
  vertexCount: number;
  indexCount: number;
  posSum: number;
  posWeighted: number;
  normalWeighted: number;
  indexHash: number;
  measuredMm: Record<string, number>;
}

function fingerprint(
  body: { positions: Float32Array; normals: Float32Array; index: ArrayLike<number> },
  measuredMm: Record<string, number | undefined>,
): Fingerprint {
  let posSum = 0;
  let posWeighted = 0;
  body.positions.forEach((v, i) => {
    posSum += v;
    posWeighted += v * ((i % 7) + 1);
  });
  let normalWeighted = 0;
  body.normals.forEach((v, i) => {
    normalWeighted += v * ((i % 5) + 1);
  });
  let indexHash = 0;
  for (let i = 0; i < body.index.length; i++) {
    indexHash = (Math.imul(indexHash, 31) + (body.index[i] ?? 0)) >>> 0;
  }
  return {
    vertexCount: body.positions.length / 3,
    indexCount: body.index.length,
    posSum,
    posWeighted,
    normalWeighted,
    indexHash,
    measuredMm: Object.fromEntries(Object.entries(measuredMm).map(([k, v]) => [k, v ?? 0])),
  };
}

CASES.push(
  {
    name: 'femme, africaine, tours de base',
    set: { sex: 'female', statureMm: 1650, chestGirthMm: 900, waistGirthMm: 720, hipGirthMm: 980 },
    expected: {
      vertexCount: 14677,
      indexCount: 80268,
      posSum: 1508064.6296193649,
      posWeighted: 6031083.715836959,
      normalWeighted: 8210.09199398163,
      indexHash: 3910496935,
      measuredMm: {
        chest: 899.9825815093551,
        waist: 719.9988612566199,
        hip: 979.9997537259048,
        neck: 294.1267978342066,
        bicep: 236.80491347805346,
        wrist: 124.11897737921859,
        thigh: 459.14855473870784,
        knee: 340.65814825532914,
        calf: 323.0771948812577,
        ankle: 177.18358782283508,
      },
    },
  },
  {
    name: 'homme, caucasien, membres et cou',
    set: {
      sex: 'male',
      statureMm: 1800,
      chestGirthMm: 1020,
      waistGirthMm: 860,
      hipGirthMm: 1000,
      neckGirthMm: 380,
      upperArmGirthMm: 320,
      wristGirthMm: 175,
      thighGirthMm: 580,
      kneeGirthMm: 380,
      calfGirthMm: 380,
      ankleGirthMm: 230,
    },
    options: { age: 40, morphotype: { african: 0, asian: 0, caucasian: 1 } },
    expected: {
      vertexCount: 14677,
      indexCount: 80268,
      posSum: 1653929.7608600229,
      posWeighted: 6614323.321258846,
      normalWeighted: 7692.631000642493,
      indexHash: 3910496935,
      measuredMm: {
        chest: 1022.6045553806745,
        waist: 860.0000933521154,
        hip: 999.9995723613141,
        neck: 380.0000049806727,
        bicep: 319.9999709000728,
        wrist: 175.0000146764287,
        thigh: 580.0004522680546,
        knee: 379.9759592555153,
        calf: 379.99999219749975,
        ankle: 229.9999926707642,
      },
    },
  },
  {
    name: 'femme, asiatique, forte corpulence',
    set: {
      sex: 'female',
      statureMm: 1580,
      chestGirthMm: 1050,
      waistGirthMm: 900,
      hipGirthMm: 1120,
      thighGirthMm: 640,
    },
    options: { age: 55, morphotype: { african: 0, asian: 1, caucasian: 0 } },
    expected: {
      vertexCount: 14677,
      indexCount: 80268,
      posSum: 1467441.3447527052,
      posWeighted: 5868725.9496084945,
      normalWeighted: 9071.044743434377,
      indexHash: 3910496935,
      measuredMm: {
        chest: 1049.9923658430407,
        waist: 900.0000146809541,
        hip: 1120.0000093589251,
        neck: 452.07354032220064,
        bicep: 284.4799007785255,
        wrist: 159.8523708712622,
        thigh: 640.000000068459,
        knee: 400.11212751746405,
        calf: 395.2254774123432,
        ankle: 211.7465551503164,
      },
    },
  },
);

describe('caractérisation du moteur mannequin', () => {
  let engine: MannequinEngine;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
  });

  it.each(CASES)('sortie figée : $name', ({ set, options, expected }) => {
    const fitted = engine.fit(set, options);
    const actual = fingerprint(fitted.body, fitted.measuredMm);
    if (process.env['PRINT_FINGERPRINT']) console.log(JSON.stringify(actual));
    expect(actual.vertexCount).toBe(expected.vertexCount);
    expect(actual.indexCount).toBe(expected.indexCount);
    expect(actual.indexHash).toBe(expected.indexHash);
    expect(actual.posSum).toBeCloseTo(expected.posSum, 2);
    expect(actual.posWeighted).toBeCloseTo(expected.posWeighted, 2);
    expect(actual.normalWeighted).toBeCloseTo(expected.normalWeighted, 2);
    expect(Object.keys(actual.measuredMm).sort()).toEqual(Object.keys(expected.measuredMm).sort());
    for (const [k, v] of Object.entries(expected.measuredMm)) {
      expect(actual.measuredMm[k]).toBeCloseTo(v, 3);
    }
  });
});
