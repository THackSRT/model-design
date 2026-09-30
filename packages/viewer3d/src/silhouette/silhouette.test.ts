import { describe, expect, it } from 'vitest';
import { grid, merge, parsePoints, rectangle } from '../../test/fixtures.js';
import { silhouettePaths } from './silhouette.js';
import { simplifyLine, simplifyLoop } from './simplify.js';

const extent = (points: [number, number][], axis: 0 | 1) => {
  const values = points.map((p) => p[axis]);
  return Math.max(...values) - Math.min(...values);
};

describe('silhouettePaths', () => {
  it('donne un contour fermé dont la boîte correspond au rectangle, à la résolution près', () => {
    const s = silhouettePaths(rectangle(0, 0, 40, 100), 'front');
    const points = parsePoints(s.d);
    expect(s.d.startsWith('M')).toBe(true);
    expect(s.d.endsWith('Z')).toBe(true);
    expect(s.widthCm).toBeCloseTo(40);
    expect(s.heightCm).toBeCloseTo(100);
    expect(Math.abs(extent(points, 0) - 40)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(extent(points, 1) - 100)).toBeLessThanOrEqual(0.5);
    expect(points.length).toBeLessThanOrEqual(6);
  });

  it('garde la concavité d’un « U » après simplification', () => {
    const u = merge(rectangle(0, 0, 10, 60), rectangle(30, 0, 40, 60), rectangle(0, 0, 40, 10));
    const points = parsePoints(silhouettePaths(u, 'front').d);
    // Les deux coins du fond du creux (x = 10 et 30, à 50 cm du haut) restent des sommets.
    const near = (cx: number, cy: number) =>
      points.some(([x, y]) => Math.abs(x - cx) < 0.6 && Math.abs(y - cy) < 0.6);
    expect(near(10, 50)).toBe(true);
    expect(near(30, 50)).toBe(true);
    // Aucun sommet ne comble le creux au-dessus de son fond.
    expect(points.some(([x, y]) => x > 11 && x < 29 && y < 49)).toBe(false);
  });

  it('produit le dos en miroir horizontal de la face pour un maillage asymétrique', () => {
    const l = merge(rectangle(0, 0, 10, 60), rectangle(0, 0, 40, 10));
    const front = silhouettePaths(l, 'front');
    const back = silhouettePaths(l, 'back');
    const f = parsePoints(front.d);
    const b = parsePoints(back.d);
    expect(back.widthCm).toBeCloseTo(front.widthCm);
    expect(b).not.toEqual(f);
    for (const [x, y] of f) {
      const mirrored = b.some(
        ([bx, by]) => Math.abs(bx - (front.widthCm - x)) < 0.6 && Math.abs(by - y) < 0.6,
      );
      expect(mirrored).toBe(true);
    }
  });

  it('projette le profil sur Z/Y', () => {
    const plate = {
      positions: Float32Array.of(0, 0, 0, 0, 0, 20, 0, 50, 20, 0, 50, 0),
      index: Uint32Array.of(0, 1, 2, 0, 2, 3),
    };
    const s = silhouettePaths(plate, 'side');
    expect(s.widthCm).toBeCloseTo(20);
    expect(s.heightCm).toBeCloseTo(50);
    expect(silhouettePaths(plate, 'front').widthCm).toBe(0);
  });

  it('est déterministe', () => {
    const mesh = merge(rectangle(0, 0, 10, 60), rectangle(0, 0, 40, 10));
    expect(silhouettePaths(mesh, 'front').d).toBe(silhouettePaths(mesh, 'front').d);
  });

  it('renvoie un chemin vide pour un maillage vide', () => {
    const empty = { positions: new Float32Array(0), index: new Uint32Array(0) };
    expect(silhouettePaths(empty, 'front')).toEqual({ d: '', widthCm: 0, heightCm: 0 });
  });

  it('traite 26 912 triangles en moins de 2 s', () => {
    const mesh = grid(116); // 2 × 116² = 26 912 triangles (un vrai mannequin : ~26 800)
    const start = performance.now();
    const s = silhouettePaths(mesh, 'front');
    expect(performance.now() - start).toBeLessThan(2000);
    expect(s.widthCm).toBeCloseTo(30);
  });
});

describe('options invalides', () => {
  const mesh = rectangle(0, 0, 10, 10);
  it('refuse une résolution nulle ou négative', () => {
    expect(() => silhouettePaths(mesh, 'front', { pxPerCm: 0 })).toThrow(RangeError);
    expect(() => silhouettePaths(mesh, 'front', { pxPerCm: -4 })).toThrow(/pxPerCm/);
  });
  it('refuse une tolérance négative', () => {
    expect(() => silhouettePaths(mesh, 'front', { toleranceCm: -1 })).toThrow(/toleranceCm/);
    expect(() => silhouettePaths(mesh, 'front', { toleranceCm: 0 })).not.toThrow();
  });
});

describe('Douglas-Peucker', () => {
  it('supprime les points colinéaires et garde les coins', () => {
    const line = simplifyLine(
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [3, 1],
        [3, 2],
      ],
      0.01,
    );
    expect(line).toEqual([
      [0, 0],
      [3, 0],
      [3, 2],
    ]);
  });

  it('simplifie une boucle fermée en gardant ses quatre coins', () => {
    const loop = simplifyLoop(
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [2, 2],
        [1, 2],
        [0, 2],
        [0, 1],
      ],
      0.01,
    );
    expect(loop).toHaveLength(4);
  });
});
