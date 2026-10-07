import { describe, expect, it } from 'vitest';
import {
  intersectSegments,
  point,
  polygonCrossings,
  reversePoints,
  signedAreaMm2,
  splitPolygon,
} from '../../src/geometry.js';
import {
  RECT,
  deepFreeze,
  expectGeometryError,
  expectPoint,
  expectPoints,
  pts,
} from './support.js';

const A = point(0, 0);
const B = point(10, 10);
const C = point(0, 10);
const D = point(10, 0);

/** Carré de 100 mm de côté, aire positive. */
const SQUARE = pts([0, 0], [100, 0], [100, 100], [0, 100]);

/** « U » ouvert vers le haut : le creux (x de 30 à 70, y de 0 à 60) est vide ; aire 100 × 100 − 40 × 60 = 7 600 mm². */
const U_SHAPE = pts([0, 0], [30, 0], [30, 60], [70, 60], [70, 0], [100, 0], [100, 100], [0, 100]);

describe('intersection de deux segments', () => {
  it('trouve le point de croisement et sa position sur chaque segment', () => {
    const hit = intersectSegments(A, B, C, D);
    expect(hit?.t).toBeCloseTo(0.5, 12);
    expect(hit?.u).toBeCloseTo(0.5, 12);
    expectPoint(hit?.point, 5, 5);
    const oblique = intersectSegments(point(0, 0), point(10, 5), point(0, 5), point(10, 0));
    expectPoint(oblique?.point, 5, 2.5);
    expect(oblique?.t).toBeCloseTo(0.5, 12);
  });

  it('compte une extrémité qui touche l’autre segment, ou une extrémité commune', () => {
    const tee = intersectSegments(point(0, 0), point(10, 0), point(5, -5), point(5, 0));
    expect(tee?.t).toBeCloseTo(0.5, 12);
    expect(tee?.u).toBeCloseTo(1, 12);
    expectPoint(tee?.point, 5, 0);
    const corner = intersectSegments(point(0, 0), point(10, 0), point(10, 0), point(10, 10));
    expectPoint(corner?.point, 10, 0);
    expect(corner?.t).toBeCloseTo(1, 12);
    expect(corner?.u).toBeCloseTo(0, 12);
  });

  it('tolère 1e-9 de la longueur d’un segment au-delà de son extrémité, pas plus', () => {
    const base = [point(0, 0), point(10, 0)] as const;
    expect(intersectSegments(...base, point(5, -5), point(5, -1e-9))).toBeDefined();
    expect(intersectSegments(...base, point(5, -5), point(5, -0.001))).toBeUndefined();
    expect(intersectSegments(...base, point(5, 5), point(5, 0.001))).toBeUndefined();
  });

  it('ne rend rien pour des segments parallèles, confondus, disjoints ou nuls', () => {
    expect(intersectSegments(point(0, 0), point(10, 0), point(0, 1), point(10, 1))).toBeUndefined();
    expect(intersectSegments(point(0, 0), point(10, 0), point(5, 0), point(15, 0))).toBeUndefined();
    expect(intersectSegments(point(0, 0), point(1, 1), point(5, 0), point(6, -3))).toBeUndefined();
    expect(intersectSegments(point(0, 0), point(0, 0), point(-5, 0), point(5, 0))).toBeUndefined();
    // Presque alignés (déterminant de 1e-13, sous 1e-12) : tenus pour parallèles, sans intersection fantôme.
    expect(
      intersectSegments(point(0, 0), point(10, 0), point(5, 0), point(15, 1e-14)),
    ).toBeUndefined();
    expect(intersectSegments(point(-5, 0), point(5, 0), point(2, 2), point(2, 2))).toBeUndefined();
  });
});

describe('croisements d’une découpe avec un contour', () => {
  it('rend les croisements dans l’ordre de la découpe, avec l’arête et la position sur chacune', () => {
    const crossings = polygonCrossings(RECT, pts([30, -10], [30, 60]));
    expect(crossings).toHaveLength(2);
    const [top, bottom] = crossings;
    expect(top?.edgeIndex).toBe(0);
    expect(top?.edgePosition).toBeCloseTo(0.3, 12);
    expect(top?.cutPosition).toBeCloseTo(10 / 70, 12);
    expectPoint(top?.point, 30, 0);
    expect(bottom?.edgeIndex).toBe(2);
    expect(bottom?.edgePosition).toBeCloseTo(0.7, 12);
    expect(bottom?.cutPosition).toBeCloseTo(60 / 70, 12);
    expectPoint(bottom?.point, 30, 50);
  });

  it('suit le sens de la découpe : inversée, elle croise dans l’ordre inverse', () => {
    const crossings = polygonCrossings(RECT, pts([30, 60], [30, -10]));
    expect(crossings.map((hit) => hit.edgeIndex)).toEqual([2, 0]);
  });

  it('numérote la place sur une découpe de plusieurs segments : indice du segment plus position', () => {
    const crossings = polygonCrossings(RECT, pts([-10, 25], [50, 25], [50, -10]));
    expect(crossings.map((hit) => hit.edgeIndex)).toEqual([3, 0]);
    expect(crossings[0]?.cutPosition).toBeCloseTo(10 / 60, 12);
    expect(crossings[1]?.cutPosition).toBeCloseTo(1 + 25 / 35, 12);
    expectPoint(crossings[0]?.point, 0, 25);
    expectPoint(crossings[1]?.point, 50, 0);
  });

  it('compte deux croisements au même point quand la découpe passe par un sommet', () => {
    const crossings = polygonCrossings(RECT, pts([-10, -10], [10, 10]));
    expect(crossings.map((hit) => hit.edgeIndex).sort()).toEqual([0, 3]);
    for (const hit of crossings) expectPoint(hit.point, 0, 0);
  });

  it('ne rend rien quand la découpe ne touche pas le contour, ou n’a pas de segment', () => {
    expect(polygonCrossings(RECT, pts([-10, -10], [-10, 100]))).toEqual([]);
    expect(polygonCrossings(RECT, pts([20, 20], [80, 30]))).toEqual([]);
    expect(polygonCrossings(RECT, pts([30, -10]))).toEqual([]);
    expect(polygonCrossings(RECT, [])).toEqual([]);
    expect(polygonCrossings([], pts([0, 0], [1, 1]))).toEqual([]);
  });
});

describe('découpe d’un polygone par une polyligne', () => {
  it('partage un rectangle par une droite : deux morceaux qui gardent le sens du contour, et la couture', () => {
    const { a, b, seam } = splitPolygon(RECT, pts([30, -10], [30, 60]));
    expectPoints(a, [
      [30, 0],
      [100, 0],
      [100, 50],
      [30, 50],
    ]);
    expectPoints(b, [
      [30, 50],
      [0, 50],
      [0, 0],
      [30, 0],
    ]);
    expectPoints(seam, [
      [30, 0],
      [30, 50],
    ]);
    expect(signedAreaMm2(a)).toBeCloseTo(3500, 9);
    expect(signedAreaMm2(b)).toBeCloseTo(1500, 9);
  });

  it('garde les points de la découpe qui sont à l’intérieur, dans la couture et dans chaque morceau', () => {
    const cut = pts([30, -10], [30, 20], [70, 20], [70, 60]);
    const { a, b, seam } = splitPolygon(RECT, cut);
    expectPoints(seam, [
      [30, 0],
      [30, 20],
      [70, 20],
      [70, 50],
    ]);
    expectPoints(a, [
      [30, 0],
      [100, 0],
      [100, 50],
      [70, 50],
      [70, 20],
      [30, 20],
    ]);
    expectPoints(b, [
      [70, 50],
      [0, 50],
      [0, 0],
      [30, 0],
      [30, 20],
      [70, 20],
    ]);
    expect(signedAreaMm2(a)).toBeCloseTo(2300, 9);
    expect(signedAreaMm2(b)).toBeCloseTo(2700, 9);
  });

  it('découpe une patte qui entre et ressort par le même côté', () => {
    const { a, b, seam } = splitPolygon(RECT, pts([20, -10], [20, 10], [60, 10], [60, -10]));
    expectPoints(a, [
      [20, 0],
      [60, 0],
      [60, 10],
      [20, 10],
    ]);
    expectPoints(seam, [
      [20, 0],
      [20, 10],
      [60, 10],
      [60, 0],
    ]);
    expect(b).toHaveLength(8);
    expect(signedAreaMm2(a)).toBeCloseTo(400, 9);
    expect(signedAreaMm2(b)).toBeCloseTo(4600, 9);
  });

  it('prend le premier et le dernier croisement quand le polygone est creux', () => {
    const { a, b, seam } = splitPolygon(U_SHAPE, pts([-10, 30], [110, 30]));
    expectPoints(seam, [
      [0, 30],
      [100, 30],
    ]);
    expect(a).toHaveLength(8);
    expectPoints(b, [
      [100, 30],
      [100, 100],
      [0, 100],
      [0, 30],
    ]);
    // Le premier morceau suit le U par le haut : il n'est pas simple, mais les aires signées s'additionnent.
    expect(signedAreaMm2(a)).toBeCloseTo(600, 9);
    expect(signedAreaMm2(b)).toBeCloseTo(7000, 9);
    expect(signedAreaMm2(a) + signedAreaMm2(b)).toBeCloseTo(signedAreaMm2(U_SHAPE), 9);
  });

  it('garde le sens d’un polygone parcouru à l’envers : les aires sont négatives', () => {
    const { a, b } = splitPolygon(reversePoints(RECT), pts([30, -10], [30, 60]));
    expect(signedAreaMm2(a)).toBeLessThan(0);
    expect(signedAreaMm2(b)).toBeLessThan(0);
    expect(signedAreaMm2(a) + signedAreaMm2(b)).toBeCloseTo(-5000, 9);
  });

  it('retire les points confondus quand la découpe passe par deux sommets : deux triangles', () => {
    const { a, b, seam } = splitPolygon(SQUARE, pts([-10, -10], [110, 110]));
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
    expect(seam).toHaveLength(2);
    expect(signedAreaMm2(a)).toBeCloseTo(5000, 9);
    expect(signedAreaMm2(b)).toBeCloseTo(5000, 9);
  });

  it('refuse une découpe qui croise le contour moins de deux fois', () => {
    expectGeometryError(() => splitPolygon(RECT, pts([-10, -10], [-10, 100])), 'no-crossing');
    expectGeometryError(() => splitPolygon(RECT, pts([50, 25], [150, 25])), 'no-crossing');
    expectGeometryError(() => splitPolygon(RECT, pts([50, 25])), 'no-crossing');
    expectGeometryError(() => splitPolygon([], pts([0, 0], [1, 1])), 'no-crossing');
  });

  it('ne modifie pas ses entrées', () => {
    const polygon = deepFreeze(pts([0, 0], [100, 0], [100, 50], [0, 50]));
    const cut = deepFreeze(pts([30, -10], [30, 20], [70, 20], [70, 60]));
    expect(() => splitPolygon(polygon, cut)).not.toThrow();
    expect(() => polygonCrossings(polygon, cut)).not.toThrow();
  });
});
