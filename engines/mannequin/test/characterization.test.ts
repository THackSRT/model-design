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
      posSum: 1508137.1764613085,
      posWeighted: 6031349.540328411,
      normalWeighted: 8181.6461279873565,
      indexHash: 3910496935,
      measuredMm: {
        chest: 899.9980652663401,
        waist: 719.9999977683565,
        hip: 980.0000116674776,
        neck: 295.1030573434854,
        bicep: 239.24109815368965,
        wrist: 124.32664556146585,
        thigh: 463.7338855546259,
        knee: 342.2735239819951,
        calf: 325.8242924765285,
        ankle: 177.55683785192957,
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
      posSum: 1467699.5718413729,
      posWeighted: 5869707.60296012,
      normalWeighted: 9087.496416573651,
      indexHash: 3910496935,
      measuredMm: {
        chest: 1049.9891845511922,
        waist: 900.0032109964662,
        hip: 1119.9987666580869,
        neck: 458.06731413827015,
        bicep: 285.86897998040075,
        wrist: 161.1095834172533,
        thigh: 640.0000107505485,
        knee: 401.1623682380275,
        calf: 397.3334842220885,
        ankle: 213.379344991409,
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
