import { describe, expect, it } from 'vitest';
import {
  FABRIC_PRESETS,
  bendingLengthMm,
  bendingRigidityMicroNm,
  deriveFabricValues,
  frictionFromSlideAngles,
  grammageGPerM2,
  meanThicknessMm,
  stripStretch,
} from '../src/index.js';

const ESTIMATED = FABRIC_PRESETS['cotton-poplin'];
const strip = { stripWidthMm: 50, gaugeLengthMm: 200, loadedLengthMm: 204, hangingMassG: 1000 };

describe('conversions des essais d’atelier', () => {
  it('grammage et épaisseur moyenne', () => {
    expect(grammageGPerM2({ sampleMassG: 30, sampleAreaMm2: 250_000 })).toBeCloseTo(120, 9);
    expect(meanThicknessMm({ readingsMm: [0.2, 0.22] })).toBeCloseTo(0.21, 9);
  });

  it('allongement de bande ramené à 10 N sur 50 mm', () => {
    const r = stripStretch(strip);
    expect(r.measuredPercent).toBeCloseTo(2, 9);
    expect(r.tensionRatio).toBeCloseTo(0.981, 9);
    expect(r.stretchPercent).toBeCloseTo(2.039, 3);
    expect(r.extrapolated).toBe(false);
    expect(stripStretch({ ...strip, hangingMassG: 200 }).extrapolated).toBe(true);
    expect(stripStretch({ ...strip, hangingMassG: 2200 }).extrapolated).toBe(true);
  });

  it('flexion : longueur et rigidité', () => {
    const c = bendingLengthMm({ overhangLengthsMm: [34, 36] });
    expect(c).toBeCloseTo(17.5, 9);
    const b = bendingRigidityMicroNm(c, 120);
    expect(b).toBeCloseTo(6.309, 3);
    expect((b / (120 * 9.81e-6)) ** (1 / 3)).toBeCloseTo(c, 9);
  });

  it('frottement : moyenne des tangentes', () => {
    expect(frictionFromSlideAngles({ slideAnglesDeg: [30], counterSurface: 'other' })).toBeCloseTo(
      0.5774,
      4,
    );
    const mean = (Math.tan(Math.PI / 9) + Math.tan(Math.PI / 6)) / 2;
    const got = frictionFromSlideAngles({ slideAnglesDeg: [20, 30], counterSurface: 'other' });
    expect(got).toBeCloseTo(mean, 12);
    expect(Math.abs(got - Math.tan((25 * Math.PI) / 180))).toBeGreaterThan(1e-4);
  });

  it('refuse les entrées invalides par RangeError', () => {
    expect(() => stripStretch({ ...strip, loadedLengthMm: 199 })).toThrow(RangeError);
    expect(() => stripStretch({ ...strip, hangingMassG: Number.NaN })).toThrow(RangeError);
    expect(() => meanThicknessMm({ readingsMm: [] as unknown as [number] })).toThrow(RangeError);
    expect(() => bendingLengthMm({ overhangLengthsMm: [] as unknown as [number] })).toThrow(
      RangeError,
    );
    expect(() => grammageGPerM2({ sampleMassG: 0, sampleAreaMm2: 250_000 })).toThrow(RangeError);
    expect(() =>
      frictionFromSlideAngles({ slideAnglesDeg: [90], counterSurface: 'other' }),
    ).toThrow(RangeError);
  });
});

describe('deriveFabricValues', () => {
  it('mesures vides : aucune grandeur', () => {
    expect(deriveFabricValues({}, ESTIMATED)).toEqual({});
  });

  it('flexion sans pesée : grammage estimé', () => {
    const d = deriveFabricValues({ bendingWarp: { overhangLengthsMm: [34, 36] } }, ESTIMATED);
    expect(d.bendingWeightSource).toBe('estimated');
    expect(d.bendingRigidityMicroNm).toBeCloseTo(
      bendingRigidityMicroNm(17.5, ESTIMATED.weightGPerM2),
      12,
    );
    expect(d.weightGPerM2).toBeUndefined();
    expect(d.bendingLengthWeftMm).toBeUndefined();
  });

  it('flexion avec pesée : grammage mesuré ; chaîne et trame en moyenne géométrique', () => {
    const d = deriveFabricValues(
      {
        weighing: { sampleMassG: 30, sampleAreaMm2: 250_000 },
        bendingWarp: { overhangLengthsMm: [34, 36] },
        bendingWeft: { overhangLengthsMm: [20, 20] },
      },
      ESTIMATED,
    );
    expect(d.bendingWeightSource).toBe('measured');
    const bw = bendingRigidityMicroNm(17.5, 120);
    const bf = bendingRigidityMicroNm(10, 120);
    expect(d.bendingRigidityWarpMicroNm).toBeCloseTo(bw, 12);
    expect(d.bendingRigidityWeftMicroNm).toBeCloseTo(bf, 12);
    expect(d.bendingRigidityMicroNm).toBeCloseTo(Math.sqrt(bw * bf), 12);
    expect(d.bendingLengthWarpMm).toBeCloseTo(17.5, 12);
    expect(d.bendingLengthWeftMm).toBeCloseTo(10, 12);
  });

  it('une grandeur par essai saisi', () => {
    const d = deriveFabricValues(
      {
        thickness: { readingsMm: [0.2, 0.22] },
        stretchWarp: strip,
        friction: { slideAnglesDeg: [30], counterSurface: 'other' },
      },
      ESTIMATED,
    );
    expect(Object.keys(d).sort()).toEqual([
      'frictionCoefficient',
      'stretchWarpPercent',
      'thicknessMm',
    ]);
  });
});
