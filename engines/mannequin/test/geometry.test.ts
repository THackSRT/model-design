import { describe, expect, it } from 'vitest';
import {
  axisOf,
  bounds,
  cross,
  dot,
  hullPerimeter,
  meanPoint,
  normalize,
} from '../src/core/geometry.js';
import type { Vec2, Vec3 } from '../src/core/types.js';

describe('vecteurs', () => {
  it('calcule produit scalaire, produit vectoriel et normalisation', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(normalize([0, 3, 4])).toEqual([0, 0.6, 0.8]);
  });

  it('le produit vectoriel est perpendiculaire aux deux vecteurs', () => {
    const a: Vec3 = [1, -2, 0.5];
    const b: Vec3 = [3, 1, -2];
    const c = cross(a, b);
    expect(dot(c, a)).toBeCloseTo(0, 12);
    expect(dot(c, b)).toBeCloseTo(0, 12);
  });
});

describe('hullPerimeter', () => {
  it("rend le périmètre d'un carré, points intérieurs ignorés", () => {
    const pts: Vec2[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [1, 1],
      [0.5, 1.5],
      [1, 0],
    ];
    const { per, hull } = hullPerimeter(pts);
    expect(per).toBeCloseTo(8, 12);
    expect(hull).toHaveLength(4);
  });

  it('approche 2πr pour des points sur un cercle', () => {
    const n = 360;
    const pts: Vec2[] = Array.from({ length: n }, (_, i) => [
      5 * Math.cos((2 * Math.PI * i) / n),
      5 * Math.sin((2 * Math.PI * i) / n),
    ]);
    expect(hullPerimeter(pts).per).toBeCloseTo(2 * Math.PI * 5, 2);
  });

  it("ne dépend pas de l'ordre des points", () => {
    const pts: Vec2[] = [
      [0, 0],
      [4, 1],
      [5, 5],
      [1, 4],
      [2, 2],
      [3, 3],
    ];
    const a = hullPerimeter(pts).per;
    const b = hullPerimeter(pts.slice().reverse()).per;
    expect(b).toBeCloseTo(a, 12);
  });

  it('rend un périmètre NaN et une enveloppe vide sous trois points', () => {
    expect(
      hullPerimeter([
        [0, 0],
        [1, 1],
      ]),
    ).toEqual({ per: Number.NaN, hull: [] });
  });

  it('un nuage translaté garde le même périmètre', () => {
    const pts: Vec2[] = [
      [0, 0],
      [3, 0],
      [3, 2],
      [0, 2],
      [1, 1],
    ];
    const moved = pts.map(([x, y]): Vec2 => [x + 100, y - 40]);
    expect(hullPerimeter(moved).per).toBeCloseTo(hullPerimeter(pts).per, 9);
  });
});

describe('axisOf', () => {
  it('trouve la direction de plus grande étendue, orientée vers le haut', () => {
    const pts: Vec3[] = [];
    for (let i = -10; i <= 10; i++) pts.push([i * 0.1, i * 0.8, i * 0.6]);
    const v = axisOf(pts);
    const l = Math.hypot(0.1, 0.8, 0.6);
    expect(v[0]).toBeCloseTo(0.1 / l, 6);
    expect(v[1]).toBeCloseTo(0.8 / l, 6);
    expect(v[2]).toBeCloseTo(0.6 / l, 6);
  });

  it('retourne un axe orienté vers le haut même si le nuage est parcouru à l’envers', () => {
    const pts: Vec3[] = [];
    for (let i = 10; i >= -10; i--) pts.push([i * 0.1, i * 0.8, i * 0.6]);
    expect(axisOf(pts)[1]).toBeGreaterThan(0);
  });

  it('rend un vecteur unitaire', () => {
    const pts: Vec3[] = [
      [0, 0, 0],
      [1, 5, 0],
      [0.5, 10, 1],
      [0, 15, 0.2],
    ];
    expect(Math.hypot(...axisOf(pts))).toBeCloseTo(1, 9);
  });
});

describe('meanPoint et bounds', () => {
  it('calcule le centre de gravité', () => {
    expect(
      meanPoint([
        [0, 0, 0],
        [2, 4, 6],
      ]),
    ).toEqual([1, 2, 3]);
  });

  it('rend les hauteurs extrêmes', () => {
    expect(bounds([0, 5, 0, 1, -2, 1, 9, 3.5, 2])).toEqual({ minY: -2, maxY: 5 });
  });
});
