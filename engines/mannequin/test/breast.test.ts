import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { fit } from '../src/core/fit.js';
import { circumference } from '../src/core/measure.js';
import { createMakeHuman } from '../src/core/makehuman.js';
import type { MhModel } from '../src/core/types.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
const MEASURES = { stature: 165, chest: 90, waist: 72, hip: 98, crotch: 76 };
const FEMME = { sex: 'femme', age: 30, african: 1, asian: 0, caucasian: 0 } as const;
const HOMME = { ...FEMME, sex: 'homme' } as const;

describe('poitrine féminine (cibles breast/)', () => {
  let model: MhModel;
  let bare: MhModel;
  beforeAll(async () => {
    const mh = createMakeHuman(async () => new Uint8Array(await readFile(DATA)));
    model = await mh.load();
    const targets = Object.fromEntries(
      Object.entries(model.targets).filter(([k]) => !k.startsWith('breast/')),
    );
    bare = { ...model, targets };
  });

  it('le paquet contient les cibles de poitrine', () => {
    expect(Object.keys(model.targets).filter((k) => k.startsWith('breast/')).length).toBe(36);
  });

  it('écart poitrine - sous-poitrine d au moins 100 mm sur le maillage', () => {
    const f = fit(model, MEASURES, FEMME);
    const gap = ((f.measured['chest'] as number) - (f.measured['underbust'] as number)) * 10;
    expect(gap).toBeGreaterThanOrEqual(100);
  });

  it('tours à 3 mm, entrejambe et repère de taille à 1 mm du corps sans cible', () => {
    const fa = fit(model, MEASURES, FEMME);
    const fb = fit(bare, MEASURES, FEMME);
    const a = fa.measured;
    const b = fb.measured;
    const waistY = (m: MhModel, pos: Float32Array): number =>
      circumference(m, pos, 'waist', 1).center[1];
    expect(Math.abs(waistY(model, fa.pos) - waistY(bare, fb.pos))).toBeLessThan(0.1);
    for (const k of ['chest', 'waist', 'hip'] as const) {
      expect(Math.abs((a[k] as number) - MEASURES[k])).toBeLessThan(0.3);
    }
    expect(Math.abs((a['crotch'] as number) - (b['crotch'] as number))).toBeLessThan(0.1);
  });

  it('homme inchangé au bit près', () => {
    const a = fit(model, { ...MEASURES, stature: 178 }, HOMME);
    const b = fit(bare, { ...MEASURES, stature: 178 }, HOMME);
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos));
  });
});
