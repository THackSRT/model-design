import { describe, expect, it } from 'vitest';
import {
  FABRIC_PROPERTIES,
  candidateFabric,
  compareToEstimate,
  drapeCoefficientWithinTolerance,
  type FabricBounds,
  type FabricPhysics,
} from '../src/index.js';

const ESTIMATED: FabricPhysics = {
  weightGPerM2: 100,
  thicknessMm: 0.4,
  stretchWarpPercent: 2,
  stretchWeftPercent: 4,
  bendingRigidityMicroNm: 10,
  frictionCoefficient: 0.4,
};

const BOUNDS: FabricBounds = {
  weightGPerM2: { minimum: 20, maximum: 800 },
  thicknessMm: { minimum: 0.05, maximum: 5 },
  stretchWarpPercent: { minimum: 0, maximum: 50 },
  stretchWeftPercent: { minimum: 0, maximum: 50 },
  bendingRigidityMicroNm: { minimum: 0.1, maximum: 1000 },
  frictionCoefficient: { minimum: 0.1, maximum: 1 },
};

describe('compareToEstimate', () => {
  it('ne retient que les grandeurs présentes, dans l’ordre des propriétés', () => {
    const d = compareToEstimate(ESTIMATED, { frictionCoefficient: 0.4, weightGPerM2: 100 });
    expect(d.map((x) => x.property)).toEqual(['weightGPerM2', 'frictionCoefficient']);
    expect(FABRIC_PROPERTIES).toHaveLength(6);
    expect(compareToEstimate(ESTIMATED, {})).toEqual([]);
  });

  it('bornes de tolérance incluses', () => {
    expect(compareToEstimate(ESTIMATED, { weightGPerM2: 110 })[0]?.withinTolerance).toBe(true);
    expect(compareToEstimate(ESTIMATED, { weightGPerM2: 90 })[0]?.withinTolerance).toBe(true);
    expect(compareToEstimate(ESTIMATED, { weightGPerM2: 110.5 })[0]?.withinTolerance).toBe(false);
    expect(compareToEstimate(ESTIMATED, { stretchWarpPercent: 3 })[0]?.withinTolerance).toBe(true);
  });

  it('l’absolu l’emporte sur les petites valeurs', () => {
    expect(compareToEstimate(ESTIMATED, { stretchWarpPercent: 2.9 })[0]?.withinTolerance).toBe(
      true,
    );
    expect(compareToEstimate(ESTIMATED, { stretchWarpPercent: 3.1 })[0]?.withinTolerance).toBe(
      false,
    );
  });

  it('écart relatif signé', () => {
    expect(compareToEstimate(ESTIMATED, { weightGPerM2: 120 })[0]?.relativeDeviation).toBeCloseTo(
      0.2,
      12,
    );
  });
});

describe('drapeCoefficientWithinTolerance', () => {
  it('à 0,05 près', () => {
    expect(drapeCoefficientWithinTolerance(0.5, 0.54)).toBe(true);
    expect(drapeCoefficientWithinTolerance(0.5, 0.46)).toBe(true);
    expect(drapeCoefficientWithinTolerance(0.5, 0.56)).toBe(false);
  });

  it('borne incluse malgré la virgule flottante', () => {
    expect(drapeCoefficientWithinTolerance(1, 0.95)).toBe(true);
    expect(drapeCoefficientWithinTolerance(1, 0.9499)).toBe(false);
  });

  it('bornes relatives exactes calculées en flottant', () => {
    expect(compareToEstimate(ESTIMATED, { weightGPerM2: 110 })[0]?.withinTolerance).toBe(true);
    const e = { ...ESTIMATED, weightGPerM2: 0.3 * 3 };
    expect(compareToEstimate(e, { weightGPerM2: 0.9 * 1.1 })[0]?.withinTolerance).toBe(true);
    expect(compareToEstimate(e, { weightGPerM2: 0.9 * 1.1001 })[0]?.withinTolerance).toBe(false);
  });
});

describe('candidateFabric', () => {
  it('une grandeur mesurée dans les bornes remplace l’estimation', () => {
    const c = candidateFabric(ESTIMATED, { weightGPerM2: 120 }, BOUNDS);
    expect(c.fabric).toEqual({ ...ESTIMATED, weightGPerM2: 120 });
    expect(c.outOfBounds).toEqual([]);
  });

  it('une valeur hors bornes garde l’estimation et est signalée', () => {
    const c = candidateFabric(ESTIMATED, { frictionCoefficient: 1.4, thicknessMm: 0.5 }, BOUNDS);
    expect(c.fabric.frictionCoefficient).toBe(0.4);
    expect(c.fabric.thicknessMm).toBe(0.5);
    expect(c.outOfBounds).toEqual(['frictionCoefficient']);
  });
});
