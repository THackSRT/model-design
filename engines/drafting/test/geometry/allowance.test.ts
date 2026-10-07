import { describe, expect, it } from 'vitest';
import {
  insetPolygonMiter,
  isPointInPolygon,
  outsetPolygonPerEdge,
  point,
  reversePoints,
  signedAreaMm2,
} from '../../src/geometry.js';
import {
  RECT,
  deepFreeze,
  expectGeometryError,
  expectPoint,
  expectPoints,
  pts,
} from './support.js';

/** Pièce de patron à plat : côtés 0 (haut), 1 (côté), 2 (bas, ourlet) et 3 (milieu devant, au pli). */
const SEAM = 10;
const HEM = 25;
const FOLD = 0;

describe('décalage à largeur variable par côté (valeurs de couture)', () => {
  it('recule chaque côté de sa valeur de couture : un onglet à chaque angle', () => {
    expectPoints(outsetPolygonPerEdge(RECT, [SEAM, SEAM, SEAM, SEAM]), [
      [-10, -10],
      [110, -10],
      [110, 60],
      [-10, 60],
    ]);
  });

  it('laisse en place un côté dont la valeur est nulle (le pli)', () => {
    expectPoints(outsetPolygonPerEdge(RECT, [SEAM, SEAM, SEAM, FOLD]), [
      [0, -10],
      [110, -10],
      [110, 60],
      [0, 60],
    ]);
  });

  it('donne un ourlet plus large que les coutures', () => {
    expectPoints(outsetPolygonPerEdge(RECT, [SEAM, SEAM, HEM, SEAM]), [
      [-10, -10],
      [110, -10],
      [110, 75],
      [-10, 75],
    ]);
  });

  it('recule vers l’extérieur quel que soit le sens du contour', () => {
    expectPoints(outsetPolygonPerEdge(reversePoints(RECT), [SEAM, SEAM, SEAM, SEAM]), [
      [-10, 60],
      [110, 60],
      [110, -10],
      [-10, -10],
    ]);
  });

  it('garde un sommet qui prolonge un côté, une seule fois', () => {
    const withMiddle = pts([0, 0], [50, 0], [100, 0], [100, 50], [0, 50]);
    expectPoints(outsetPolygonPerEdge(withMiddle, [SEAM, SEAM, SEAM, SEAM, SEAM]), [
      [-10, -10],
      [50, -10],
      [110, -10],
      [110, 60],
      [-10, 60],
    ]);
  });

  it('laisse un redan entre deux côtés alignés de valeurs différentes', () => {
    const withMiddle = pts([0, 0], [50, 0], [100, 0], [100, 50], [0, 50]);
    expectPoints(outsetPolygonPerEdge(withMiddle, [SEAM, HEM, SEAM, SEAM, SEAM]), [
      [-10, -10],
      [50, -10],
      [50, -25],
      [110, -25],
      [110, 60],
      [-10, 60],
    ]);
  });

  it('remplace par un biseau l’onglet d’un angle très aigu : deux points à la valeur de couture du sommet', () => {
    // Pointe de 22,6° : l'onglet serait à 51 mm du sommet, au-delà de 4 × 10 mm.
    const spike = pts([0, 0], [100, -20], [100, 20]);
    const outset = outsetPolygonPerEdge(spike, [SEAM, SEAM, SEAM]);
    expect(outset).toHaveLength(4);
    const apex = point(0, 0);
    for (const bevelPoint of outset.slice(0, 2)) {
      expect(Math.hypot(bevelPoint.xMm - apex.xMm, bevelPoint.yMm - apex.yMm)).toBeCloseTo(10, 9);
    }
    expectPoint(outset[0], -10 * 0.19611613513818404, 10 * 0.9805806756909202);
    expectPoint(outset[1], -10 * 0.19611613513818404, -10 * 0.9805806756909202);
  });

  it('garde l’onglet d’une très petite valeur de couture : la limite est de 4 mm au moins', () => {
    // Pointe de 20° et valeur de 0,1 mm : l'onglet est à 0,58 mm du sommet, au-delà de 4 × 0,1 mm mais sous 4 mm.
    const spike = pts([0, 0], [100, -17.63], [100, 17.63]);
    expect(outsetPolygonPerEdge(spike, [0.1, 0.1, 0.1])).toHaveLength(3);
  });

  it('rend le polygone lui-même quand toutes les valeurs de couture sont nulles', () => {
    expectPoints(outsetPolygonPerEdge(RECT, [0, 0, 0, 0]), [
      [0, 0],
      [100, 0],
      [100, 50],
      [0, 50],
    ]);
  });

  it('garde l’onglet jusqu’à 4 fois la valeur de couture, puis passe au biseau', () => {
    // Une pointe d'angle θ a son onglet à 10 / sin(θ/2) du sommet : 35 mm pour 33°, 46 mm pour 26° (limite : 40 mm).
    const sharp = (halfWidth: number): ReturnType<typeof pts> =>
      pts([0, 0], [100, -halfWidth], [100, halfWidth]);
    expect(outsetPolygonPerEdge(sharp(29.81), [SEAM, SEAM, SEAM])).toHaveLength(3);
    expect(outsetPolygonPerEdge(sharp(22.29), [SEAM, SEAM, SEAM])).toHaveLength(4);
  });

  it('s’accorde avec insetPolygonMiter pour une même valeur partout, sans angle aigu', () => {
    const polygon = pts([0, 0], [100, 10], [140, 70], [90, 130], [10, 100]);
    const outset = outsetPolygonPerEdge(polygon, [8, 8, 8, 8, 8]);
    const miter = insetPolygonMiter(polygon, -8);
    expect(outset).toHaveLength(5);
    outset.forEach((p, i) =>
      expectPoint(p, miter[i]?.xMm ?? Number.NaN, miter[i]?.yMm ?? Number.NaN, 8),
    );
  });

  it('enveloppe le polygone : tous ses sommets sont dans le résultat, dont l’aire est plus grande', () => {
    const outset = outsetPolygonPerEdge(RECT, [SEAM, SEAM, HEM, SEAM]);
    for (const p of RECT) expect(isPointInPolygon(p, outset)).toBe(true);
    expect(signedAreaMm2(outset)).toBeGreaterThan(signedAreaMm2(RECT));
  });

  it('refuse un nombre de valeurs qui n’est pas celui des côtés', () => {
    expectGeometryError(() => outsetPolygonPerEdge(RECT, [SEAM, SEAM, SEAM]), 'invalid-argument');
    expectGeometryError(
      () => outsetPolygonPerEdge(RECT, [SEAM, SEAM, SEAM, SEAM, SEAM]),
      'invalid-argument',
    );
    expectGeometryError(() => outsetPolygonPerEdge(RECT, []), 'invalid-argument');
  });

  it('rend une liste vide pour un polygone vide, et un point pour un polygone réduit à un point', () => {
    expect(outsetPolygonPerEdge([], [])).toEqual([]);
    expect(outsetPolygonPerEdge(pts([4, 4]), [SEAM])).toEqual(pts([4, 4]));
  });

  it('ne modifie pas ses entrées', () => {
    const polygon = deepFreeze(pts([0, 0], [100, 0], [100, 50], [0, 50]));
    const allowances = deepFreeze([SEAM, SEAM, HEM, FOLD]);
    expect(() => outsetPolygonPerEdge(polygon, allowances)).not.toThrow();
  });
});
