import { describe, expect, it } from 'vitest';
import {
  isPublicPoint,
  nameVertices,
  publicPoints,
  sitsRoughlyOn,
  vertexCandidates,
} from '../src/core/points.js';
import type { PointMm } from '../src/core/types.js';

const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });

describe('points publics', () => {
  it('écarte les points temporaires (_) et garde l’ordre de création', () => {
    expect(isPublicPoint('armhole')).toBe(true);
    expect(isPublicPoint('_tmp1')).toBe(false);
    expect(isPublicPoint('__macro_title_nr')).toBe(false);
    const points = { b: p(1, 1), _t: p(2, 2), a: p(3, 3), __m: p(4, 4) };
    expect(Object.keys(publicPoints(points))).toEqual(['b', 'a']);
  });
});

describe('nameVertices', () => {
  it('rend, pour chaque sommet, tous les points à 0,01 mm près, ou une liste vide', () => {
    const vertices = [p(0, 0), p(100, 0), p(50, 50)];
    const points = { origin: p(0, 0), alias: p(0.01, -0.01), right: p(100, 0.2), mid: p(50, 50) };
    expect(nameVertices(vertices, points)).toEqual([['origin', 'alias'], [], ['mid']]);
  });
});

describe('sitsRoughlyOn', () => {
  it('reprend le critère de FreeSewing : mêmes coordonnées arrondies au millimètre', () => {
    expect(sitsRoughlyOn(p(0, 0), p(0.4, -0.4))).toBe(true);
    expect(sitsRoughlyOn(p(10.2, 5.4), p(9.6, 4.6))).toBe(true); // 10 et 5 des deux côtés, à 1 mm l'un de l'autre
    expect(sitsRoughlyOn(p(0, 0), p(0.5, 0))).toBe(false); // 0,5 s'arrondit à 1
    expect(sitsRoughlyOn(p(599.4, 0), p(599.6, 0))).toBe(false); // de part et d'autre d'un arrondi
    expect(sitsRoughlyOn(p(600.1, 0), p(599.6, 0))).toBe(true);
  });
});

describe('vertexCandidates', () => {
  const vertices = [p(0, 0), p(100, 0.3), p(100, 100), p(0, 100)];

  it('trouve le sommet qui coïncide à 0,01 mm près', () => {
    expect(vertexCandidates(vertices, p(100, 100.005))).toEqual([2]);
  });

  it('trouve tous les sommets quand le contour repasse par le point', () => {
    expect(vertexCandidates([p(5, 5), p(9, 9), p(5, 5)], p(5, 5))).toEqual([0, 2]);
  });

  it('à défaut, prend le sommet que FreeSewing a confondu avec le point (même millimètre)', () => {
    expect(vertexCandidates(vertices, p(0.3, 100.3))).toEqual([3]);
    expect(vertexCandidates(vertices, p(100, 0))).toEqual([1]);
  });

  it('préfère une coïncidence exacte à une confusion de FreeSewing', () => {
    const near = [p(10, 10), p(10.4, 10.4)];
    expect(vertexCandidates(near, p(10.4, 10.4))).toEqual([1]);
  });

  it('ne rend rien pour un point qui n’est sur aucun sommet', () => {
    expect(vertexCandidates(vertices, p(50, 50))).toEqual([]);
    expect(vertexCandidates(vertices, p(0, 101.6))).toEqual([]);
  });
});
