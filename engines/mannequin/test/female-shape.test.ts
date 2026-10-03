import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMakeHuman, type MakeHuman, type MakeHumanFit } from '../src/core/makehuman.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
const MEASURES = { stature: 165, chest: 90, waist: 72, hip: 98 };
const FEMME = { sex: 'femme', age: 30, african: 1, asian: 0, caucasian: 0 } as const;

/** Avancée du fessier (cm) : distance de l'arrière du corps au plan z = 0, dans ±3 cm autour du bassin. */
function seatProjection(fit: MakeHumanFit): number {
  const { scale, minY } = fit.measured as unknown as { scale: number; minY: number };
  const y = fit.measured.rings['hip']?.center[1] ?? 0;
  let back = 0;
  for (let i = 0; i < fit.pos.length; i += 3) {
    const h = ((fit.pos[i + 1] as number) - minY) * scale;
    if (Math.abs(h - y) <= 3) back = Math.min(back, (fit.pos[i + 2] as number) * scale);
  }
  return -back;
}

describe('silhouette féminine', () => {
  let mh: MakeHuman;
  beforeAll(async () => {
    mh = createMakeHuman(async () => new Uint8Array(await readFile(DATA)));
    await mh.load();
  });

  it('poitrine marquée : au moins 10 cm entre poitrine et sous-poitrine mesurées sur le maillage', () => {
    const fit = mh.fit(MEASURES, FEMME);
    expect(
      (fit.measured['chest'] as number) - (fit.measured['underbust'] as number),
    ).toBeGreaterThanOrEqual(10);
  });

  it('un tour sous-poitrine donné est respecté', () => {
    const fit = mh.fit({ ...MEASURES, underbust: 76 }, FEMME);
    expect(Math.abs((fit.measured['underbust'] as number) - 76)).toBeLessThan(0.6);
  });

  it('poitrine, taille et hanches restent à 3 mm de la demande', () => {
    const fit = mh.fit(MEASURES, FEMME);
    for (const k of ['chest', 'waist', 'hip'] as const) {
      expect(Math.abs((fit.measured[k] as number) - MEASURES[k])).toBeLessThan(0.3);
    }
  });

  it('fessier plus galbé que l’ancien réglage par défaut', () => {
    const now = seatProjection(mh.fit(MEASURES, FEMME));
    const before = seatProjection(mh.fit(MEASURES, { ...FEMME, belly: 0.2, seat: 0.4 }));
    expect(now).toBeGreaterThan(before);
  });

  it('homme : ventre et fessier par défaut inchangés', () => {
    const homme = { ...FEMME, sex: 'homme' } as const;
    const a = mh.fit({ ...MEASURES, stature: 178 }, homme);
    const b = mh.fit({ ...MEASURES, stature: 178 }, { ...homme, belly: 0.2, seat: 0.4 });
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos));
  });

  it('déterministe', () => {
    const a = mh.fit(MEASURES, FEMME);
    const b = mh.fit(MEASURES, FEMME);
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos));
  });
});
