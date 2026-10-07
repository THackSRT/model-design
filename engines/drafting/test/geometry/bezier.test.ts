import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CURVE_SEGMENTS,
  DEFAULT_SMOOTH_SEGMENTS,
  flattenPath,
  point,
  polylineLengthMm,
  sampleCubic,
  smoothCatmullRom,
} from '../../src/geometry.js';
import type { CubicMm, PathOpMm } from '../../src/geometry.js';
import type { PathOp } from '../../src/core/types.js';
import { deepFreeze, expectGeometryError, expectPoint, expectPoints, pts } from './support.js';

/** Arche : monte de (0, 0) à (0, 100), traverse à y = 100, redescend en (100, 0). */
const ARCH: CubicMm = {
  from: point(0, 0),
  cp1: point(0, 100),
  cp2: point(100, 100),
  to: point(100, 0),
};

describe('courbe de Bézier cubique échantillonnée', () => {
  it('rend segments + 1 points, du départ à l’arrivée exactement', () => {
    const samples = sampleCubic(ARCH, 4);
    expect(samples).toHaveLength(5);
    expect(samples[0]).toEqual(ARCH.from);
    expect(samples[4]).toEqual(ARCH.to);
  });

  it('passe par le point connu au milieu : (p0 + 3·c1 + 3·c2 + p3) / 8', () => {
    const [start, middle, end] = sampleCubic(ARCH, 2);
    expect(start).toEqual(point(0, 0));
    expectPoint(middle, 50, 75);
    expect(end).toEqual(point(100, 0));
  });

  it('suit un paramètre régulier quand les points de contrôle sont au tiers et aux deux tiers du segment', () => {
    const straight = sampleCubic(
      { from: point(0, 0), cp1: point(10, 0), cp2: point(20, 0), to: point(30, 0) },
      3,
    );
    expectPoints(straight, [
      [0, 0],
      [10, 0],
      [20, 0],
      [30, 0],
    ]);
  });

  it('rend deux points pour un seul segment', () => {
    expect(sampleCubic(ARCH, 1)).toEqual([ARCH.from, ARCH.to]);
  });

  it('échantillonne par défaut en 24 segments', () => {
    expect(DEFAULT_CURVE_SEGMENTS).toBe(24);
    expect(sampleCubic(ARCH)).toHaveLength(25);
    expect(DEFAULT_SMOOTH_SEGMENTS).toBe(12);
  });

  it('approche la longueur d’un quart de cercle de rayon 100 mm (π × 50 = 157,08 mm)', () => {
    const kappa = 0.5522847498;
    const quarter: CubicMm = {
      from: point(100, 0),
      cp1: point(100, 100 * kappa),
      cp2: point(100 * kappa, 100),
      to: point(0, 100),
    };
    expect(polylineLengthMm(sampleCubic(quarter, 240))).toBeCloseTo(157.08, 1);
  });

  it('refuse un nombre de segments qui n’est pas un entier d’au moins 1', () => {
    for (const segments of [0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectGeometryError(() => sampleCubic(ARCH, segments), 'invalid-argument');
    }
  });

  it('ne modifie pas ses entrées', () => {
    expect(() => sampleCubic(deepFreeze({ ...ARCH }), 8)).not.toThrow();
  });
});

describe('spline de Catmull-Rom', () => {
  const ARC = pts([0, 0], [10, 10], [20, 0]);

  it('rend une copie de l’entrée quand elle a moins de 3 points', () => {
    const two = pts([0, 0], [5, 5]);
    expect(smoothCatmullRom(two)).toEqual(two);
    expect(smoothCatmullRom(two)).not.toBe(two);
    expect(smoothCatmullRom([])).toEqual([]);
  });

  it('passe exactement par chaque point donné, aux indices multiples du nombre de segments', () => {
    const through = pts([0, 0], [30, 40], [90, 10], [120, 80], [200, 60]);
    const smoothed = smoothCatmullRom(through, 6);
    expect(smoothed).toHaveLength((through.length - 1) * 6 + 1);
    through.forEach((p, i) => expect(smoothed[i * 6]).toEqual(p));
  });

  it('garde sur la droite des points alignés, sans reculer', () => {
    const smoothed = smoothCatmullRom(pts([0, 0], [10, 0], [20, 0]), 4);
    expect(smoothed).toHaveLength(9);
    expect(smoothed.every((p) => p.yMm === 0)).toBe(true);
    smoothed
      .slice(1)
      .forEach((p, i) => expect(p.xMm).toBeGreaterThan(smoothed[i]?.xMm ?? Infinity));
    expect(smoothed[4]).toEqual(point(10, 0));
    expect(smoothed[8]).toEqual(point(20, 0));
  });

  it('est symétrique pour une entrée symétrique, et horizontale au sommet', () => {
    const smoothed = smoothCatmullRom(ARC, 4);
    expect(smoothed).toHaveLength(9);
    smoothed.forEach((p, i) => {
      const mirror = smoothed[8 - i];
      expect(p.xMm + (mirror?.xMm ?? Number.NaN)).toBeCloseTo(20, 9);
      expect(p.yMm).toBeCloseTo(mirror?.yMm ?? Number.NaN, 9);
    });
    // Milieu de la première portion : points de contrôle (5/3, 5/3) et (20/3, 10), donc (4,375 ; 5,625).
    expectPoint(smoothed[2], 4.375, 5.625);
    // Le point milieu est le plus haut : la courbe y est horizontale.
    expect(Math.max(...smoothed.map((p) => p.yMm))).toBe(10);
    expect(smoothed[4]).toEqual(point(10, 10));
  });

  it('lisse en 12 segments par portion par défaut', () => {
    expect(smoothCatmullRom(ARC)).toHaveLength(2 * 12 + 1);
  });

  it('refuse un nombre de segments invalide dès qu’il y a une courbe à tracer', () => {
    expectGeometryError(() => smoothCatmullRom(ARC, 0), 'invalid-argument');
    expect(() => smoothCatmullRom(pts([0, 0], [1, 1]), 0)).not.toThrow();
  });

  it('ne modifie pas ses entrées', () => {
    expect(() => smoothCatmullRom(deepFreeze(pts([0, 0], [4, 4], [9, 1])), 5)).not.toThrow();
  });
});

describe('tracé FreeSewing en polyligne', () => {
  const CURVE = {
    type: 'curve',
    cp1: point(10, 10),
    cp2: point(20, 10),
    to: point(20, 0),
  } as const;

  it('relie les lignes et échantillonne chaque courbe depuis le point où elle commence', () => {
    const ops: PathOpMm[] = [
      { type: 'move', to: point(0, 0) },
      { type: 'line', to: point(10, 0) },
      CURVE,
    ];
    expectPoints(flattenPath(ops, 2), [
      [0, 0],
      [10, 0],
      [15, 7.5],
      [20, 0],
    ]);
  });

  it('ignore close : le polygone se ferme de lui-même', () => {
    const ops: PathOpMm[] = [
      { type: 'move', to: point(0, 0) },
      { type: 'line', to: point(10, 0) },
      { type: 'line', to: point(10, 10) },
      { type: 'close' },
    ];
    expectPoints(flattenPath(ops), [
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });

  it('met les sous-tracés bout à bout', () => {
    const ops: PathOpMm[] = [
      { type: 'move', to: point(0, 0) },
      { type: 'line', to: point(1, 1) },
      { type: 'move', to: point(5, 5) },
      { type: 'line', to: point(6, 6) },
    ];
    expectPoints(flattenPath(ops), [
      [0, 0],
      [1, 1],
      [5, 5],
      [6, 6],
    ]);
  });

  it('échantillonne par défaut en 24 segments par courbe', () => {
    const ops: PathOpMm[] = [{ type: 'move', to: point(10, 0) }, CURVE];
    expect(flattenPath(ops)).toHaveLength(1 + 24);
  });

  it('prend une ligne en premier pour le départ, refuse une courbe sans départ, rend [] pour rien', () => {
    expectPoints(flattenPath([{ type: 'line', to: point(1, 1) }, CURVE], 1), [
      [1, 1],
      [20, 0],
    ]);
    expectGeometryError(() => flattenPath([CURVE]), 'invalid-argument');
    expect(flattenPath([])).toEqual([]);
  });

  it('accepte les opérations de tracé de l’entrée . : mêmes formes, sans conversion', () => {
    const traced: readonly PathOp[] = [
      { type: 'move', to: { xMm: 0, yMm: 0 } },
      { type: 'line', to: { xMm: 4, yMm: 0 } },
      { type: 'close' },
    ];
    expectPoints(flattenPath(traced), [
      [0, 0],
      [4, 0],
    ]);
  });

  it('ne modifie pas ses entrées', () => {
    const ops = deepFreeze<PathOpMm[]>([{ type: 'move', to: point(0, 0) }, { ...CURVE }]);
    expect(() => flattenPath(ops, 4)).not.toThrow();
  });
});
