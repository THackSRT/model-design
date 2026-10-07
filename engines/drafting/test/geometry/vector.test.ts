import { describe, expect, it } from 'vitest';
import {
  addPoints,
  crossProduct,
  distanceMm,
  dotProduct,
  leftNormal,
  lerpPoint,
  mirrorPoint,
  mirrorPoints,
  normalize,
  point,
  rightNormal,
  scalePoint,
  subtractPoints,
} from '../../src/geometry.js';
import { deepFreeze, expectPoint, expectPoints, pts } from './support.js';

describe('points et vecteurs', () => {
  it('construit un point en millimètres, x puis y', () => {
    expect(point(3, -4)).toEqual({ xMm: 3, yMm: -4 });
  });

  it('additionne, soustrait et met à l’échelle', () => {
    expect(addPoints(point(1, 2), point(10, 20))).toEqual(point(11, 22));
    expect(subtractPoints(point(10, 20), point(1, 2))).toEqual(point(9, 18));
    expect(scalePoint(point(2, -3), 4)).toEqual(point(8, -12));
  });

  it('interpole entre deux points, et prolonge le segment hors de 0 à 1', () => {
    const a = point(10, 0);
    const b = point(20, 40);
    expect(lerpPoint(a, b, 0)).toEqual(a);
    expect(lerpPoint(a, b, 1)).toEqual(b);
    expectPoint(lerpPoint(a, b, 0.25), 12.5, 10);
    expectPoint(lerpPoint(a, b, 2), 30, 80);
    expectPoint(lerpPoint(a, b, -1), 0, -40);
  });

  it('mesure la distance entre deux points (3, 4, 5), dans les deux sens', () => {
    expect(distanceMm(point(0, 0), point(3, 4))).toBe(5);
    expect(distanceMm(point(3, 4), point(0, 0))).toBe(5);
    expect(distanceMm(point(7, 7), point(7, 7))).toBe(0);
    expect(distanceMm(point(-1, -1), point(2, 3))).toBe(5);
  });

  it('calcule les produits scalaire et vectoriel (le vectoriel est positif dans le sens horaire à l’écran)', () => {
    expect(dotProduct(point(1, 2), point(3, 4))).toBe(11);
    expect(dotProduct(point(1, 0), point(0, 1))).toBe(0);
    // (1, 0) pointe à droite, (0, 1) vers le bas : de l’un à l’autre, on tourne dans le sens des aiguilles d’une montre.
    expect(crossProduct(point(1, 0), point(0, 1))).toBe(1);
    expect(crossProduct(point(0, 1), point(1, 0))).toBe(-1);
    expect(crossProduct(point(2, 3), point(4, 6))).toBe(0);
  });

  it('normalise en vecteur unitaire ; le vecteur nul reste nul', () => {
    expectPoint(normalize(point(3, 4)), 0.6, 0.8);
    expectPoint(normalize(point(0, -10)), 0, -1);
    expectPoint(normalize(point(0, 0)), 0, 0);
  });

  it('donne la perpendiculaire à gauche (vers le haut quand on va vers la droite) et à droite', () => {
    expectPoint(leftNormal(point(1, 0)), 0, -1);
    expectPoint(leftNormal(point(0, 1)), 1, 0);
    expectPoint(rightNormal(point(1, 0)), 0, 1);
    expectPoint(rightNormal(point(0, 1)), -1, 0);
    const v = point(3, 4);
    expect(dotProduct(leftNormal(v), v)).toBe(0);
    expect(dotProduct(rightNormal(v), v)).toBe(0);
    expect(addPoints(leftNormal(v), rightNormal(v))).toEqual(point(0, 0));
  });

  it('met en miroir par rapport à l’axe du pli (x = 0), ou à une verticale donnée', () => {
    expect(mirrorPoint(point(5, 7))).toEqual(point(-5, 7));
    expect(mirrorPoint(point(-5, 7))).toEqual(point(5, 7));
    expect(mirrorPoint(point(4, 1), 10)).toEqual(point(16, 1));
    expect(mirrorPoint(point(10, 1), 10)).toEqual(point(10, 1));
    expectPoints(mirrorPoints(pts([1, 2], [3, 4])), [
      [-1, 2],
      [-3, 4],
    ]);
  });

  it('ne rend jamais −0 pour un point sur l’axe', () => {
    expect(Object.is(mirrorPoint(point(0, 3)).xMm, 0)).toBe(true);
  });

  it('ne modifie pas ses entrées', () => {
    const a = deepFreeze(point(1, 2));
    const b = deepFreeze(point(3, 4));
    const list = deepFreeze(pts([1, 2], [3, 4]));
    expect(() => {
      addPoints(a, b);
      subtractPoints(a, b);
      scalePoint(a, 2);
      lerpPoint(a, b, 0.5);
      normalize(a);
      leftNormal(a);
      rightNormal(a);
      mirrorPoint(a);
      mirrorPoints(list);
    }).not.toThrow();
  });
});
