import { describe, expect, it } from 'vitest';
import { DEDUPE_TOLERANCE_MM, boundingBox, dedupePoints } from '../../src/geometry.js';
import { RECT, deepFreeze, expectGeometryError, pts } from './support.js';

describe('points confondus', () => {
  it('fixe la tolérance à 0,05 mm', () => {
    expect(DEDUPE_TOLERANCE_MM).toBe(0.05);
  });

  it('retire un point consécutif à moins de 0,05 mm du précédent, et garde ceux qui en sont plus loin', () => {
    const line = pts([0, 0], [0.04, 0], [0.049, 0], [0.2, 0], [0.2, 0.04], [5, 5], [5.06, 5]);
    expect(dedupePoints(line)).toEqual(pts([0, 0], [0.2, 0], [5, 5], [5.06, 5]));
  });

  it('compare à chaque fois au dernier point gardé : une dérive lente finit par donner un nouveau point', () => {
    const drift = pts([0, 0], [0.04, 0], [0.08, 0], [0.12, 0], [0.16, 0]);
    expect(dedupePoints(drift)).toEqual(pts([0, 0], [0.08, 0], [0.16, 0]));
  });

  it('garde les points identiques qui ne se suivent pas', () => {
    const there = pts([0, 0], [10, 0], [0, 0]);
    expect(dedupePoints(there)).toEqual(there);
  });

  it('retire, pour un polygone, les derniers points confondus avec le premier', () => {
    const wrapped = pts([0, 0], [10, 0], [10, 10], [0.03, 0.01]);
    expect(dedupePoints(wrapped, true)).toEqual(pts([0, 0], [10, 0], [10, 10]));
    expect(dedupePoints(wrapped)).toEqual(wrapped);
    // Deux points proches du premier, mais à 0,08 mm l'un de l'autre : tous deux sont retirés.
    const twice = pts([0, 0], [10, 0], [10, 10], [0.04, 0], [-0.04, 0]);
    expect(dedupePoints(twice, true)).toEqual(pts([0, 0], [10, 0], [10, 10]));
  });

  it('ne vide jamais un polygone : il garde deux points distincts, ou un seul si tout se confond', () => {
    expect(dedupePoints(pts([0, 0], [10, 0], [0.04, 0]), true)).toEqual(pts([0, 0], [10, 0]));
    expect(dedupePoints(pts([0, 0], [0.01, 0], [0.02, 0]), true)).toEqual(pts([0, 0]));
  });

  it('prend la tolérance demandée', () => {
    const line = pts([0, 0], [0.5, 0], [1.2, 0], [1.4, 0]);
    expect(dedupePoints(line, false, 1)).toEqual(pts([0, 0], [1.2, 0]));
    expect(dedupePoints(line, false, 0)).toEqual(line);
  });

  it('rend une liste vide pour une liste vide, et un nouveau tableau dans tous les cas', () => {
    expect(dedupePoints([])).toEqual([]);
    expect(dedupePoints(RECT)).not.toBe(RECT);
    expect(dedupePoints(RECT)).toEqual(RECT);
  });

  it('est idempotent et ne modifie pas son entrée', () => {
    const line = deepFreeze(pts([0, 0], [0.01, 0], [3, 0], [3, 0.02], [9, 9], [0.02, 0.02]));
    const once = dedupePoints(line, true);
    expect(dedupePoints(once, true)).toEqual(once);
    expect(line).toHaveLength(6);
  });
});

describe('boîte englobante', () => {
  it('rend les minimums et les maximums de x et de y', () => {
    expect(boundingBox(pts([3, -2], [-7, 4], [10, 1], [0, 9]))).toEqual({
      minXMm: -7,
      minYMm: -2,
      maxXMm: 10,
      maxYMm: 9,
    });
  });

  it('rend une boîte réduite à un point pour un seul point', () => {
    expect(boundingBox(pts([4, 5]))).toEqual({ minXMm: 4, minYMm: 5, maxXMm: 4, maxYMm: 5 });
  });

  it('couvre un contour entier', () => {
    expect(boundingBox(RECT)).toEqual({ minXMm: 0, minYMm: 0, maxXMm: 100, maxYMm: 50 });
  });

  it('accepte une très longue liste (pas de limite d’arguments)', () => {
    const many = Array.from({ length: 300_000 }, (_, i) => ({ xMm: i, yMm: 0 - i }));
    expect(boundingBox(many)).toEqual({ minXMm: 0, minYMm: -299_999, maxXMm: 299_999, maxYMm: 0 });
  });

  it('refuse une liste vide', () => {
    expectGeometryError(() => boundingBox([]), 'invalid-argument');
  });
});
