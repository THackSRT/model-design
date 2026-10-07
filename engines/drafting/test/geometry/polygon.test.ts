import { describe, expect, it } from 'vitest';
import {
  boundaryXMm,
  isPointInPolygon,
  mirrorPoints,
  point,
  reversePoints,
  signedAreaMm2,
} from '../../src/geometry.js';
import { RECT, deepFreeze, pts } from './support.js';

/** « L » : une barre en haut (x de 0 à 100, y de 0 à 40) et une barre à gauche (x de 0 à 40, y de 40 à 100) ; le coin x > 40, y > 40 est vide. */
const L_SHAPE = pts([0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100]);

/** Losange dont les sommets sont à mi-hauteur et à mi-largeur. */
const DIAMOND = pts([50, 0], [100, 50], [50, 100], [0, 50]);

describe('aire signée', () => {
  it('est positive dans le sens horaire à l’écran (y vers le bas) et négative dans l’autre', () => {
    expect(signedAreaMm2(RECT)).toBe(5000);
    expect(signedAreaMm2(reversePoints(RECT))).toBe(-5000);
    expect(signedAreaMm2(pts([0, 0], [10, 0], [0, 10]))).toBe(50);
  });

  it('ne dépend ni du point de départ ni de la position du polygone', () => {
    const shifted = RECT.map((p) => point(p.xMm + 1234.5, p.yMm - 987.25));
    expect(signedAreaMm2(shifted)).toBeCloseTo(5000, 6);
    expect(signedAreaMm2([...RECT.slice(2), ...RECT.slice(0, 2)])).toBe(5000);
  });

  it('change de signe par symétrie, et vaut l’aire d’un polygone creux', () => {
    expect(signedAreaMm2(mirrorPoints(RECT))).toBe(-5000);
    expect(signedAreaMm2(L_SHAPE)).toBe(100 * 100 - 60 * 60);
  });

  it('est nulle pour moins de trois points, un contour plat ou un nœud papillon', () => {
    expect(signedAreaMm2([])).toBe(0);
    expect(signedAreaMm2(pts([3, 4]))).toBe(0);
    expect(signedAreaMm2(pts([0, 0], [9, 7]))).toBe(0);
    expect(signedAreaMm2(pts([0, 0], [5, 0], [10, 0]))).toBe(0);
    expect(signedAreaMm2(pts([0, 0], [10, 10], [10, 0], [0, 10]))).toBe(0);
  });

  it('ne modifie pas son entrée', () => {
    expect(signedAreaMm2(deepFreeze(pts([0, 0], [4, 0], [4, 4])))).toBe(8);
  });
});

describe('point dans un polygone', () => {
  it('distingue l’intérieur de l’extérieur d’un rectangle', () => {
    for (const [x, y] of [
      [50, 25],
      [1, 1],
      [99, 49],
    ] as const) {
      expect(isPointInPolygon(point(x, y), RECT), `(${x}, ${y})`).toBe(true);
    }
    for (const [x, y] of [
      [150, 25],
      [-1, 25],
      [50, -1],
      [50, 51],
      [-10, -10],
    ] as const) {
      expect(isPointInPolygon(point(x, y), RECT), `(${x}, ${y})`).toBe(false);
    }
  });

  it('reconnaît le creux d’un polygone non convexe', () => {
    expect(isPointInPolygon(point(20, 70), L_SHAPE)).toBe(true);
    expect(isPointInPolygon(point(70, 20), L_SHAPE)).toBe(true);
    expect(isPointInPolygon(point(70, 70), L_SHAPE)).toBe(false);
    expect(isPointInPolygon(point(120, 20), L_SHAPE)).toBe(false);
  });

  it('donne le même résultat quel que soit le sens du contour', () => {
    const turned = reversePoints(L_SHAPE);
    for (const [x, y] of [
      [20, 70],
      [70, 70],
      [70, 20],
      [-5, 5],
    ] as const) {
      expect(isPointInPolygon(point(x, y), turned)).toBe(isPointInPolygon(point(x, y), L_SHAPE));
    }
  });

  it('traite justement un point à la hauteur d’un sommet', () => {
    expect(isPointInPolygon(point(25, 50), DIAMOND)).toBe(true);
    expect(isPointInPolygon(point(75, 50), DIAMOND)).toBe(true);
    expect(isPointInPolygon(point(125, 50), DIAMOND)).toBe(false);
    expect(isPointInPolygon(point(-25, 50), DIAMOND)).toBe(false);
    expect(isPointInPolygon(point(-10, 0), RECT)).toBe(false);
    expect(isPointInPolygon(point(150, 50), RECT)).toBe(false);
  });

  it('rend faux pour un polygone vide ou réduit à un point', () => {
    expect(isPointInPolygon(point(0, 0), [])).toBe(false);
    expect(isPointInPolygon(point(0, 0), pts([0, 0]))).toBe(false);
  });
});

describe('abscisse du contour à une hauteur', () => {
  it('rend la plus grande abscisse (côté droit) par défaut, la plus petite avec min', () => {
    expect(boundaryXMm(RECT, 25)).toBe(100);
    expect(boundaryXMm(RECT, 25, 'max')).toBe(100);
    expect(boundaryXMm(RECT, 25, 'min')).toBe(0);
  });

  it('interpole le long des côtés obliques', () => {
    const triangle = pts([0, 0], [100, 0], [0, 100]);
    expect(boundaryXMm(triangle, 50)).toBeCloseTo(50, 9);
    expect(boundaryXMm(triangle, 50, 'min')).toBe(0);
    expect(boundaryXMm(triangle, 80)).toBeCloseTo(20, 9);
  });

  it('compte les côtés verticaux aux hauteurs de leurs extrémités, et ignore les côtés horizontaux', () => {
    expect(boundaryXMm(RECT, 0)).toBe(100);
    expect(boundaryXMm(RECT, 0, 'min')).toBe(0);
    expect(boundaryXMm(RECT, 50)).toBe(100);
    expect(boundaryXMm(RECT, 50, 'min')).toBe(0);
  });

  it('prend les extrêmes d’un contour creux', () => {
    expect(boundaryXMm(L_SHAPE, 70)).toBe(40);
    expect(boundaryXMm(L_SHAPE, 70, 'min')).toBe(0);
    expect(boundaryXMm(L_SHAPE, 20)).toBe(100);
  });

  it('rend undefined hors de la hauteur du contour', () => {
    expect(boundaryXMm(RECT, -1)).toBeUndefined();
    expect(boundaryXMm(RECT, 51, 'min')).toBeUndefined();
    expect(boundaryXMm([], 0)).toBeUndefined();
  });
});
