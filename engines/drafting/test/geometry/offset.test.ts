import { describe, expect, it } from 'vitest';
import {
  insetPolygon,
  insetPolygonMiter,
  offsetPolyline,
  reversePoints,
  signedAreaMm2,
} from '../../src/geometry.js';
import { RECT, deepFreeze, expectPoint, expectPoints, pts } from './support.js';

const SQUARE = pts([0, 0], [100, 0], [100, 100], [0, 100]);

describe('décalage d’une polyligne ouverte', () => {
  it('décale à gauche du sens de parcours, vers le haut de l’écran pour une ligne qui va vers la droite', () => {
    expectPoints(offsetPolyline(pts([0, 0], [10, 0], [20, 0]), 5), [
      [0, -5],
      [10, -5],
      [20, -5],
    ]);
    expectPoints(offsetPolyline(pts([0, 0], [10, 0], [20, 0]), -5), [
      [0, 5],
      [10, 5],
      [20, 5],
    ]);
  });

  it('inverse le côté quand on inverse le sens de parcours', () => {
    expectPoints(offsetPolyline(pts([20, 0], [10, 0], [0, 0]), 5), [
      [20, 5],
      [10, 5],
      [0, 5],
    ]);
  });

  it('glisse chaque point le long de la normale à la corde de ses voisins : pas d’onglet dans l’angle', () => {
    expectPoints(offsetPolyline(pts([0, 0], [10, 0], [10, 10]), 10), [
      [0, -10],
      [10 + 10 * Math.SQRT1_2, -10 * Math.SQRT1_2],
      [20, 10],
    ]);
  });

  it('rend les mêmes points pour un décalage nul, et garde le nombre de points', () => {
    const line = pts([0, 0], [10, 4], [25, -3], [30, 30]);
    const same = offsetPolyline(line, 0);
    expect(same).toHaveLength(4);
    same.forEach((p, i) => expectPoint(p, line[i]?.xMm ?? Number.NaN, line[i]?.yMm ?? Number.NaN));
  });

  it('laisse en place un point isolé et rend une liste vide pour une liste vide', () => {
    expect(offsetPolyline(pts([3, 3]), 7)).toEqual(pts([3, 3]));
    expect(offsetPolyline([], 7)).toEqual([]);
  });

  it('décale les deux points d’un segment de la même façon', () => {
    expectPoints(offsetPolyline(pts([0, 0], [0, 10]), 2), [
      [2, 0],
      [2, 10],
    ]);
  });

  it('ne modifie pas son entrée', () => {
    const line = deepFreeze(pts([0, 0], [10, 0], [10, 10]));
    expect(() => offsetPolyline(line, 3)).not.toThrow();
  });
});

describe('décalage d’un polygone sans onglet (surpiqûre)', () => {
  it('rentre chaque sommet le long de la normale à la corde de ses voisins : le point i vient du sommet i', () => {
    const r = 10 * Math.SQRT1_2;
    expectPoints(insetPolygon(SQUARE, 10), [
      [r, r],
      [100 - r, r],
      [100 - r, 100 - r],
      [r, 100 - r],
    ]);
  });

  it('déplace d’exactement la distance un sommet qui prolonge un côté', () => {
    const withMiddle = pts([0, 0], [50, 0], [100, 0], [100, 100], [0, 100]);
    expectPoint(insetPolygon(withMiddle, 10)[1], 50, 10);
  });

  it('va vers l’intérieur quel que soit le sens du contour, et vers l’extérieur pour une distance négative', () => {
    const inward = insetPolygon(SQUARE, 10);
    const turned = insetPolygon(reversePoints(SQUARE), 10);
    turned.forEach((p, i) => {
      expectPoint(p, inward[3 - i]?.xMm ?? Number.NaN, inward[3 - i]?.yMm ?? Number.NaN);
    });
    const outward = insetPolygon(SQUARE, -10);
    expectPoint(outward[0], -10 * Math.SQRT1_2, -10 * Math.SQRT1_2);
    expect(Math.abs(signedAreaMm2(inward))).toBeLessThan(10000);
    expect(Math.abs(signedAreaMm2(outward))).toBeGreaterThan(10000);
  });

  it('rend tels quels (en copie) les contours de moins de 3 points', () => {
    const two = pts([0, 0], [10, 0]);
    expect(insetPolygon(two, 5)).toEqual(two);
    expect(insetPolygon(two, 5)).not.toBe(two);
    expect(insetPolygon([], 5)).toEqual([]);
  });

  it('ne modifie pas son entrée', () => {
    expect(() => insetPolygon(deepFreeze(pts([0, 0], [9, 0], [9, 9], [0, 9])), 2)).not.toThrow();
  });
});

describe('décalage d’un polygone avec onglets limités', () => {
  it('place les côtés à la distance demandée : un carré rentre en carré', () => {
    expectPoints(insetPolygonMiter(SQUARE, 10), [
      [10, 10],
      [90, 10],
      [90, 90],
      [10, 90],
    ]);
  });

  it('sort le polygone avec une distance négative', () => {
    expectPoints(insetPolygonMiter(SQUARE, -10), [
      [-10, -10],
      [110, -10],
      [110, 110],
      [-10, 110],
    ]);
  });

  it('va vers l’intérieur quel que soit le sens du contour', () => {
    const turned = insetPolygonMiter(reversePoints(RECT), 5);
    expectPoints(turned, [
      [5, 45],
      [95, 45],
      [95, 5],
      [5, 5],
    ]);
  });

  it('limite l’onglet à 1 / 0,35 fois la distance aux angles très aigus', () => {
    // Pointe de 22,6° : l'onglet exact serait à 10 / sin(11,3°) = 51 mm ; il est limité à 10 / 0,35 = 28,57 mm.
    const spike = pts([0, 0], [100, -20], [100, 20]);
    const inset = insetPolygonMiter(spike, 10);
    expectPoint(inset[0], 10 / 0.35, 0);
    // Un angle plus ouvert garde son onglet exact : à 100 mm de la pointe, le côté vertical recule de 10 mm.
    expect(inset[1]?.xMm).toBeCloseTo(90, 6);
    expect(inset[2]?.xMm).toBeCloseTo(90, 6);
  });

  it('laisse en place les polygones réduits à un point et rend une liste vide pour une liste vide', () => {
    expect(insetPolygonMiter(pts([4, 4]), 3)).toEqual(pts([4, 4]));
    expect(insetPolygonMiter([], 3)).toEqual([]);
  });

  it('ne modifie pas son entrée', () => {
    expect(() =>
      insetPolygonMiter(deepFreeze(pts([0, 0], [9, 0], [9, 9], [0, 9])), 2),
    ).not.toThrow();
  });
});
