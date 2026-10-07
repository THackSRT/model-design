import { describe, expect, it } from 'vitest';
import {
  nearestPointOnPolyline,
  point,
  pointAt,
  polylineLengthMm,
  resamplePolyline,
  reversePoints,
  slicePolyline,
  tangentAt,
} from '../../src/geometry.js';
import {
  RECT,
  deepFreeze,
  expectGeometryError,
  expectPoint,
  expectPoints,
  pts,
} from './support.js';

/** Trois côtés de 10 mm : 30 mm au total. */
const Z = pts([0, 0], [10, 0], [10, 10], [20, 10]);

describe('longueur et abscisse curviligne', () => {
  it('mesure la longueur : somme des segments, 0 pour zéro ou un point', () => {
    expect(polylineLengthMm(Z)).toBe(30);
    expect(polylineLengthMm(pts([0, 0], [3, 4]))).toBe(5);
    expect(polylineLengthMm(pts([5, 5]))).toBe(0);
    expect(polylineLengthMm([])).toBe(0);
  });

  it('donne le point à une abscisse, par interpolation dans le segment', () => {
    expectPoint(pointAt(Z, 5), 5, 0);
    expectPoint(pointAt(Z, 15), 10, 5);
    expectPoint(pointAt(Z, 25), 15, 10);
  });

  it('borne l’abscisse : le premier point avant le début, le dernier au-delà de la fin', () => {
    expect(pointAt(Z, 0)).toEqual(point(0, 0));
    expect(pointAt(Z, -50)).toEqual(point(0, 0));
    expect(pointAt(Z, 30)).toEqual(point(20, 10));
    expect(pointAt(Z, 1000)).toEqual(point(20, 10));
  });

  it('rend le sommet lui-même à l’abscisse d’un sommet, et le dernier point à la longueur totale', () => {
    expect(pointAt(Z, 10)).toBe(Z[1]);
    expect(pointAt(Z, 20)).toBe(Z[2]);
    expect(pointAt(Z, polylineLengthMm(Z))).toBe(Z[3]);
    const skewed = pts([0, 0], [0.1, 0], [0.8, 0], [0.8, 0.3]);
    expect(pointAt(skewed, polylineLengthMm(skewed))).toBe(skewed[3]);
  });

  it('saute les segments nuls (points répétés)', () => {
    const repeated = pts([0, 0], [0, 0], [10, 0], [10, 0], [10, 10]);
    expectPoint(pointAt(repeated, 5), 5, 0);
    expectPoint(pointAt(repeated, 10), 10, 0);
    expectPoint(pointAt(repeated, 15), 10, 5);
  });

  it('rend l’unique point d’une polyligne réduite à un point, et refuse une polyligne vide', () => {
    expect(pointAt(pts([4, 2]), 0)).toEqual(point(4, 2));
    expect(pointAt(pts([4, 2]), 9)).toEqual(point(4, 2));
    expectGeometryError(() => pointAt([], 0), 'invalid-argument');
    expectGeometryError(() => pointAt([], 5), 'invalid-argument');
  });

  it('donne la tangente unitaire, prise sur la corde de ± 1 mm', () => {
    expectPoint(tangentAt(Z, 5), 1, 0);
    expectPoint(tangentAt(Z, 15), 0, 1);
    // Dans l’angle (abscisse 10), la corde va de (9, 0) à (10, 1) : à 45°.
    expectPoint(tangentAt(Z, 10), Math.SQRT1_2, Math.SQRT1_2);
    // À 0,5 mm avant l'angle, la corde va de (8,5 ; 0) à (10 ; 0,5) : ± 1 mm, pas plus.
    expectPoint(tangentAt(Z, 9.5), 1.5 / Math.hypot(1.5, 0.5), 0.5 / Math.hypot(1.5, 0.5));
    // Au début et à la fin, la corde se réduit à ce qui reste de polyligne d’un seul côté.
    expectPoint(tangentAt(Z, 0), 1, 0);
    expectPoint(tangentAt(Z, 30), 1, 0);
  });

  it('rend une tangente nulle à plus d’un millimètre hors de la polyligne', () => {
    expectPoint(tangentAt(Z, -20), 0, 0);
    expectPoint(tangentAt(Z, 40), 0, 0);
  });

  it('rend une tangente nulle pour une polyligne réduite à un point', () => {
    expectPoint(tangentAt(pts([3, 3]), 0), 0, 0);
    expectPoint(tangentAt(pts([3, 3], [3, 3]), 1), 0, 0);
  });
});

describe('portion et rééchantillonnage', () => {
  it('découpe la portion entre deux abscisses : les deux extrémités et les sommets strictement entre elles', () => {
    expectPoints(slicePolyline(Z, 5, 25), [
      [5, 0],
      [10, 0],
      [10, 10],
      [15, 10],
    ]);
    expectPoints(slicePolyline(Z, 12, 18), [
      [10, 2],
      [10, 8],
    ]);
  });

  it('rend toute la polyligne de 0 à sa longueur', () => {
    expect(slicePolyline(Z, 0, 30)).toEqual(Z);
  });

  it('ne répète pas un sommet qui tombe sur une extrémité, ni la fin quand toMm la dépasse', () => {
    expect(slicePolyline(pts([0, 0], [10, 0], [10, 0]), 0, 100)).toEqual(pts([0, 0], [10, 0]));
    expectPoints(slicePolyline(Z, 10, 25), [
      [10, 0],
      [10, 10],
      [15, 10],
    ]);
    expectPoints(slicePolyline(Z, 5, 20), [
      [5, 0],
      [10, 0],
      [10, 10],
    ]);
  });

  it('borne les abscisses comme pointAt', () => {
    expect(slicePolyline(Z, -10, 100)).toEqual(Z);
    expectPoints(slicePolyline(Z, 25, 100), [
      [15, 10],
      [20, 10],
    ]);
  });

  it('ne rend que les deux points extrêmes quand les bornes sont inversées ou égales', () => {
    expectPoints(slicePolyline(Z, 25, 5), [
      [15, 10],
      [5, 0],
    ]);
    expectPoints(slicePolyline(Z, 5, 5), [
      [5, 0],
      [5, 0],
    ]);
  });

  it('rééchantillonne à pas régulier : premier et dernier points conservés, pas égal si la longueur le permet', () => {
    const line = pts([0, 0], [100, 0]);
    const samples = resamplePolyline(line, 10);
    expect(samples).toHaveLength(11);
    samples.forEach((p, i) => expectPoint(p, i * 10, 0));
    expect(samples[10]).toBe(line[1]);
  });

  it('prend le nombre de segments qui approche le mieux le pas, au moins 1', () => {
    const line = pts([0, 0], [100, 0]);
    expectPoints(resamplePolyline(line, 30), [
      [0, 0],
      [100 / 3, 0],
      [200 / 3, 0],
      [100, 0],
    ]);
    expectPoints(resamplePolyline(line, 1000), [
      [0, 0],
      [100, 0],
    ]);
    expectPoints(resamplePolyline(line, 60), [
      [0, 0],
      [50, 0],
      [100, 0],
    ]);
  });

  it('suit les angles de la polyligne : les points sont équidistants en abscisse curviligne', () => {
    // 30 mm au pas de 7,5 mm : quatre segments, aux abscisses 0, 7,5, 15, 22,5 et 30.
    expectPoints(resamplePolyline(Z, 7.5), [
      [0, 0],
      [7.5, 0],
      [10, 5],
      [12.5, 10],
      [20, 10],
    ]);
  });

  it('rééchantillonne un point isolé en deux points identiques', () => {
    expectPoints(resamplePolyline(pts([4, 4]), 10), [
      [4, 4],
      [4, 4],
    ]);
  });

  it('refuse un pas nul, négatif, infini ou non numérique, et une polyligne vide', () => {
    for (const step of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectGeometryError(() => resamplePolyline(Z, step), 'invalid-argument');
    }
    expectGeometryError(() => resamplePolyline([], 10), 'invalid-argument');
  });
});

describe('inversion et point le plus proche', () => {
  it('inverse l’ordre des points sans modifier l’entrée', () => {
    const line = deepFreeze(pts([1, 1], [2, 2], [3, 3]));
    expect(reversePoints(line)).toEqual(pts([3, 3], [2, 2], [1, 1]));
    expect(line).toEqual(pts([1, 1], [2, 2], [3, 3]));
  });

  it('trouve le point le plus proche dans un segment, avec sa distance et son abscisse', () => {
    const nearest = nearestPointOnPolyline(Z, point(4, 3));
    expectPoint(nearest.point, 4, 0);
    expect(nearest.distanceMm).toBeCloseTo(3, 9);
    expect(nearest.lengthMm).toBeCloseTo(4, 9);
    const second = nearestPointOnPolyline(Z, point(13, 5));
    expectPoint(second.point, 10, 5);
    expect(second.distanceMm).toBeCloseTo(3, 9);
    expect(second.lengthMm).toBeCloseTo(15, 9);
  });

  it('borne la projection aux extrémités de la polyligne', () => {
    const before = nearestPointOnPolyline(Z, point(-3, -4));
    expectPoint(before.point, 0, 0);
    expect(before.distanceMm).toBeCloseTo(5, 9);
    expect(before.lengthMm).toBe(0);
    const after = nearestPointOnPolyline(Z, point(23, 14));
    expectPoint(after.point, 20, 10);
    expect(after.lengthMm).toBeCloseTo(30, 9);
  });

  it('rend le premier point rencontré à égalité de distance', () => {
    const tie = nearestPointOnPolyline(pts([0, 0], [10, 0], [10, 10], [0, 10]), point(-5, 5));
    expectPoint(tie.point, 0, 0);
    expect(tie.lengthMm).toBe(0);
  });

  it('compte le côté de fermeture d’un polygone avec closed, et seulement avec lui', () => {
    const target = point(-5, 25);
    const closed = nearestPointOnPolyline(RECT, target, true);
    expectPoint(closed.point, 0, 25);
    expect(closed.distanceMm).toBeCloseTo(5, 9);
    // 100 + 50 + 100 pour les trois premiers côtés, puis 25 sur le côté de fermeture, de (0, 50) vers (0, 0).
    expect(closed.lengthMm).toBeCloseTo(275, 9);
    const open = nearestPointOnPolyline(RECT, target);
    expectPoint(open.point, 0, 0);
    expect(open.distanceMm).toBeGreaterThan(25);
  });

  it('trouve le point le plus proche sur un contour, d’un côté ou de l’autre', () => {
    const below = nearestPointOnPolyline(RECT, point(50, 70), true);
    expectPoint(below.point, 50, 50);
    expect(below.distanceMm).toBeCloseTo(20, 9);
    expect(below.lengthMm).toBeCloseTo(200, 9);
    const inside = nearestPointOnPolyline(RECT, point(40, 10), true);
    expectPoint(inside.point, 40, 0);
    expect(inside.distanceMm).toBeCloseTo(10, 9);
  });

  it('traite un point isolé et un segment nul, et refuse une polyligne vide', () => {
    const alone = nearestPointOnPolyline(pts([2, 2]), point(5, 6));
    expectPoint(alone.point, 2, 2);
    expect(alone.distanceMm).toBe(5);
    expect(alone.lengthMm).toBe(0);
    const stalled = nearestPointOnPolyline(pts([0, 0], [0, 0], [10, 0]), point(4, 2));
    expectPoint(stalled.point, 4, 0);
    expect(stalled.lengthMm).toBeCloseTo(4, 9);
    expectGeometryError(() => nearestPointOnPolyline([], point(0, 0)), 'invalid-argument');
  });

  it('ne modifie pas ses entrées', () => {
    const line = deepFreeze(pts([0, 0], [10, 0], [10, 10]));
    expect(() => {
      polylineLengthMm(line);
      pointAt(line, 5);
      tangentAt(line, 5);
      slicePolyline(line, 2, 14);
      resamplePolyline(line, 3);
      nearestPointOnPolyline(line, point(3, 3));
    }).not.toThrow();
  });
});
