// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { loadMannequinEngine, type MannequinEngine } from '@atelier/mannequin';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  handleDressRequest,
  handleFitRequest,
  type WorkerState,
} from '../src/platform/fit-protocol.js';

const DATA = new URL('../../../engines/mannequin/assets/makehuman.mhz', import.meta.url);
const GOLDEN = new URL('../../../engines/patterning/tests/golden/', import.meta.url);
/** Corsage à manches de référence du patronage (lecture seule). */
const spec = JSON.parse(
  readFileSync(new URL('bodice-with-sleeves-reference.json', GOLDEN), 'utf8'),
) as never;
const measurements = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 640,
  hipGirthMm: 960,
  crotchHeightMm: 770,
} as never;
/** Sommets d'un tube (anneaux x segments) du maillage du corsage. */
const TUBE = 48 * 72;

describe('habillage bras levés dans le worker', () => {
  let engine: MannequinEngine;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
  });

  it('le corps retenu garde armsMm, et le corsage à manches a trois tubes', () => {
    const state: WorkerState = {};
    const fit = handleFitRequest(
      engine,
      { id: 1, measurements, options: { armAngleDeg: 90 } },
      state,
    );
    expect(fit.response.ok).toBe(true);
    expect(state.last?.armsMm?.left.lengthMm).toBeGreaterThan(0);
    const { response } = handleDressRequest(state, {
      kind: 'dress',
      id: 2,
      spec,
      garment: { type: 'bodice' },
      options: { sleeveLengthMm: 500 },
    });
    if (!response.ok) throw new Error(response.message);
    expect(response.garment.positions.length / 3).toBe(3 * TUBE);
  });
});
