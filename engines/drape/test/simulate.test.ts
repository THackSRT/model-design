import { describe, expect, it } from 'vitest';
import { simulate } from '../src/index.js';
import { boxBody, FABRIC, gridCloth, NO_BODY, SETTINGS } from './helpers.js';

describe('simulate : entrées et arrêt', () => {
  const cloth = gridCloth({ nx: 4, ny: 4, edgeMm: 10, place: (u, v) => [u, 0, v] });

  it('refuse des tableaux de tailles incohérentes', () => {
    expect(() =>
      simulate({ ...cloth, positionsMm: new Float64Array(6) }, NO_BODY, FABRIC, SETTINGS),
    ).toThrow(RangeError);
    expect(() =>
      simulate({ ...cloth, grainUnit: new Float64Array(3) }, NO_BODY, FABRIC, SETTINGS),
    ).toThrow(RangeError);
  });

  it('refuse des réglages invalides', () => {
    expect(() => simulate(cloth, NO_BODY, FABRIC, { ...SETTINGS, stepS: 0 })).toThrow(RangeError);
    expect(() => simulate(cloth, NO_BODY, FABRIC, { ...SETTINGS, substeps: 0 })).toThrow(
      RangeError,
    );
  });

  it("sans pas à faire, rend l'état initial", () => {
    const r = simulate(cloth, NO_BODY, FABRIC, { ...SETTINGS, maxSteps: 0 });
    expect(r.steps).toBe(0);
    expect(r.converged).toBe(false);
    expect(Array.from(r.positionsMm)).toEqual(Array.from(cloth.positionsMm));
    expect(r.maxPenetrationMm).toBe(0);
  });

  it("un carré posé sur une plaque s'arrête avant maxSteps (critère de repos) sans la traverser", () => {
    const plate = boxBody([-200, -100, -200], [400, 0, 0], [0, 100, 0], [0, 0, 400]); // dessus à y = 0
    const lifted = gridCloth({ nx: 4, ny: 4, edgeMm: 10, place: (u, v) => [u, 20, v] });
    const r = simulate(lifted, plate, FABRIC, { ...SETTINGS, maxSteps: 400 });
    expect(r.converged).toBe(true);
    expect(r.steps).toBeLessThan(400);
    for (let v = 0; v < 25; v++) {
      const y = r.positionsMm[3 * v + 1] as number;
      expect(y).toBeGreaterThan(FABRIC.thicknessMm + 2 - 0.5);
      expect(y).toBeLessThan(FABRIC.thicknessMm + 2 + 0.5);
    }
  });
});
