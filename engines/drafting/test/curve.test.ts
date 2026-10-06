import { describe, expect, it } from 'vitest';
import { cubicLengthMm, distanceMm } from '../src/core/curve.js';
import type { PointMm } from '../src/core/types.js';
import { mulberry32 } from './helpers.js';

const point = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });

/** Longueur d'une courbe de Bézier cubique par `chords` cordes : référence indépendante de la quadrature. */
function chordLength(curve: readonly [PointMm, PointMm, PointMm, PointMm], chords: number): number {
  const [p0, c1, c2, p3] = curve;
  const at = (t: number): PointMm => {
    const u = 1 - t;
    const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
    return point(
      b[0] * p0.xMm + b[1] * c1.xMm + b[2] * c2.xMm + b[3] * p3.xMm,
      b[0] * p0.yMm + b[1] * c1.yMm + b[2] * c2.yMm + b[3] * p3.yMm,
    );
  };
  let total = 0;
  let previous = at(0);
  for (let i = 1; i <= chords; i++) {
    const next = at(i / chords);
    total += distanceMm(previous, next);
    previous = next;
  }
  return total;
}

describe('distanceMm', () => {
  it('mesure la distance entre deux points', () => {
    expect(distanceMm(point(0, 0), point(3, 4))).toBe(5);
    expect(distanceMm(point(-2, 1), point(-2, 1))).toBe(0);
    expect(distanceMm(point(1, 1), point(4, 5))).toBe(distanceMm(point(4, 5), point(1, 1)));
  });
});

describe('cubicLengthMm', () => {
  it('rend la distance quand la courbe est un segment de droite', () => {
    const length = cubicLengthMm(point(0, 0), point(10, 0), point(20, 0), point(30, 0));
    expect(length).toBeCloseTo(30, 9);
    const diagonal = cubicLengthMm(point(0, 0), point(1, 1), point(2, 2), point(3, 3));
    expect(diagonal).toBeCloseTo(3 * Math.SQRT2, 9);
  });

  it('rend une longueur nulle pour une courbe réduite à un point', () => {
    expect(cubicLengthMm(point(5, 5), point(5, 5), point(5, 5), point(5, 5))).toBe(0);
  });

  it('approche le quart de cercle de rayon 100 mm (Bézier de constante 0,5523) à 0,05 mm près', () => {
    const k = 0.5522847498307936 * 100;
    const length = cubicLengthMm(point(100, 0), point(100, k), point(k, 100), point(0, 100));
    expect(Math.abs(length - (Math.PI / 2) * 100)).toBeLessThan(0.05);
  });

  it('concorde avec une référence à 100 000 cordes pour des arcs de patron tirés au hasard (1e-6 mm)', () => {
    const random = mulberry32(2026);
    for (let i = 0; i < 60; i++) {
      // Arc lisse de 50 à 400 mm, bombé d'au plus 35 % de sa corde de chaque côté : emmanchures, encolures, têtes de manche.
      const chord = 50 + random() * 350;
      const bulge = (): number => (random() * 0.7 - 0.35) * chord;
      const p0 = point(0, 0);
      const p3 = point(chord, 0);
      const c1 = point(chord * (0.2 + random() * 0.2), bulge());
      const c2 = point(chord * (0.6 + random() * 0.2), bulge());
      const reference = chordLength([p0, c1, c2, p3], 100_000);
      expect(Math.abs(cubicLengthMm(p0, c1, c2, p3) - reference)).toBeLessThan(1e-6);
    }
  });

  it('ne dépend pas du sens de parcours', () => {
    const p0 = point(0, 0);
    const c1 = point(80, 150);
    const c2 = point(220, -40);
    const p3 = point(300, 90);
    const forward = cubicLengthMm(p0, c1, c2, p3);
    expect(cubicLengthMm(p3, c2, c1, p0)).toBeCloseTo(forward, 9);
  });
});
