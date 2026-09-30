import { readFile } from 'node:fs/promises';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadMannequinEngine, type MannequinEngine, toMakeHumanMeasures } from '../src/index.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);

const reference: MeasurementSet = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 900,
  waistGirthMm: 720,
  hipGirthMm: 980,
};

describe('moteur mannequin', () => {
  let engine: MannequinEngine;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
  });

  it('convertit les mesures du contrat (mm) vers le mannequin (cm)', () => {
    expect(toMakeHumanMeasures(reference)).toEqual({ stature: 165, chest: 90, waist: 72, hip: 98 });
  });

  it('ajuste le corps aux tours demandés à 6 mm près', () => {
    const fitted = engine.fit(reference);
    for (const [key, target] of [
      ['chest', 900],
      ['waist', 720],
      ['hip', 980],
    ] as const) {
      expect(Math.abs((fitted.measuredMm[key] ?? 0) - target)).toBeLessThan(6);
    }
  });

  it('accepte des données déjà décompressées en route (Content-Encoding: gzip)', async () => {
    const raw = new Uint8Array(
      await new Response(
        new Blob([await readFile(DATA)]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).arrayBuffer(),
    );
    const again = await loadMannequinEngine(async () => raw);
    expect(Math.abs((again.fit(reference).measuredMm.hip ?? 0) - 980)).toBeLessThan(6);
  });

  it('rend un maillage de corps et une tête lisse', () => {
    const fitted = engine.fit(reference);
    expect(fitted.body.positions.length).toBe(fitted.body.normals.length);
    expect(fitted.body.index.length % 3).toBe(0);
    expect(fitted.head.positions.length).toBeGreaterThan(0);
  });
});
