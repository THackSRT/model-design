import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMakeHuman, type MakeHuman } from '../src/core/makehuman.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
const MEASURES = { stature: 165, chest: 90, waist: 72, hip: 98 };
const FEMME = { sex: 'femme', age: 30, african: 1, asian: 0, caucasian: 0 } as const;

describe('silhouette féminine', () => {
  let mh: MakeHuman;
  beforeAll(async () => {
    mh = createMakeHuman(async () => new Uint8Array(await readFile(DATA)));
    await mh.load();
  });

  it('un tour sous-poitrine fourni ne change pas le corps', () => {
    const a = mh.fit(MEASURES, FEMME);
    const b = mh.fit({ ...MEASURES, underbust: 76 } as typeof MEASURES, FEMME);
    expect(Array.from(b.pos)).toEqual(Array.from(a.pos));
  });

  it('poitrine, taille et hanches restent à 3 mm de la demande', () => {
    const fit = mh.fit(MEASURES, FEMME);
    for (const k of ['chest', 'waist', 'hip'] as const) {
      expect(Math.abs((fit.measured[k] as number) - MEASURES[k])).toBeLessThan(0.3);
    }
  });

  it('déterministe', () => {
    const a = mh.fit(MEASURES, FEMME);
    const b = mh.fit(MEASURES, FEMME);
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos));
  });
});
