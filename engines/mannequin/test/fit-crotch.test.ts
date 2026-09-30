import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { crotchStep } from '../src/core/fit.js';
import type { FitContext } from '../src/core/fit-macro.js';
import { createMakeHuman } from '../src/core/makehuman.js';
import { macro } from '../src/core/morph.js';
import type { MhModel } from '../src/core/types.js';

describe('crotchStep', () => {
  let model: MhModel;
  beforeAll(async () => {
    const bytes = new Uint8Array(
      await readFile(new URL('../assets/makehuman.mhz', import.meta.url)),
    );
    model = await createMakeHuman(async () => bytes).load();
  });

  it('redescend depuis la borne haute quand la cible est plus basse', () => {
    const params = {
      gender: 0,
      age: 30,
      african: 1,
      asian: 0,
      caucasian: 0,
      weight: 0.5,
      muscle: 0.5,
    };
    const ctx = {
      model,
      stature: 170,
      crotch: 78,
      goal: () => 0,
      targets: [],
    } as unknown as FitContext;
    const vals = { upperleg: 1 };
    crotchStep(ctx, macro(model, params), vals);
    expect(vals.upperleg).toBeLessThan(0.95);
    expect(Number.isFinite(vals.upperleg)).toBe(true);
  });
});
