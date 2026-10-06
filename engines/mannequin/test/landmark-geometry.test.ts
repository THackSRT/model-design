import { describe, expect, it } from 'vitest';
import { armpitPoint } from '../src/core/armpit.js';
import { crotchPath } from '../src/core/crotch.js';
import { readBody } from '../src/core/derive.js';
import { shoulderPoints } from '../src/core/shoulder.js';
import type { Measured, Vec3 } from '../src/core/types.js';
import { type Point2, prism } from './helpers/prism.js';

const mirrored = (poly: Point2[]): Point2[] => poly.map(([a, b]) => [-a, b] as Point2);

describe('épaule : repères lus sur le contour supérieur', () => {
  // Moitié gauche du haut du corps vue de face, étirée en z : cou vertical à x = 6, puis trois pentes
  // (1,25 : jonction du cou ; 0,3 : haut de l'épaule ; 1,2 : le contour plonge dans le bras).
  const silhouette: Point2[] = [
    [0, 20],
    [24, 20],
    [24, 40],
    [20, 52.3],
    [16, 57.1],
    [8, 59.5],
    [6, 62],
    [6, 70],
    [0, 70],
  ];
  const solid = prism(silhouette, 10, (a, b, c) => [a, b, c]);
  const neck = { halfWidth: 6.2, y: 60 };

  it("place le point d'encolure où le contour quitte le cou et l'acromion où il plonge", () => {
    const { neckShoulder, acromion } = shoulderPoints(
      { pos: solid.pos, tris: solid.tris, pivot: [12, 40, 5], neck },
      1,
    );
    // coin du cou en x = 8 (pente 1,25 puis 0,3) ; coin de l'épaule en x = 16 (pente 0,3 puis 1,2)
    expect(neckShoulder[0]).toBeGreaterThan(7);
    expect(neckShoulder[0]).toBeLessThan(8.2);
    expect(neckShoulder[1]).toBeGreaterThan(59.4);
    expect(neckShoulder[1]).toBeLessThan(60.5);
    expect(acromion[0]).toBeGreaterThan(15.4);
    expect(acromion[0]).toBeLessThan(16.2);
    expect(acromion[1]).toBeGreaterThan(56.9);
    expect(acromion[1]).toBeLessThan(57.5);
  });

  it('lit le côté droit comme le miroir du côté gauche', () => {
    const left = shoulderPoints({ pos: solid.pos, tris: solid.tris, pivot: [12, 40, 5], neck }, 1);
    const flipped = prism(mirrored(silhouette), 10, (a, b, c) => [a, b, c]);
    const right = shoulderPoints(
      { pos: flipped.pos, tris: flipped.tris, pivot: [-12, 40, 5], neck },
      -1,
    );
    for (const key of ['neckShoulder', 'acromion'] as const) {
      expect(right[key][0]).toBeCloseTo(-left[key][0], 4);
      expect(right[key][1]).toBeCloseTo(left[key][1], 4);
      expect(right[key][2]).toBeCloseTo(left[key][2], 4);
    }
  });

  it('signale un contour trop court au lieu de rendre un repère inventé', () => {
    const empty = { pos: new Float32Array(0), tris: new Uint16Array(0) };
    expect(() => shoulderPoints({ ...empty, pivot: [12, 40, 5], neck }, 1)).toThrow(/épaule/);
  });
});

describe('aisselle : haut du creux entre le bras et le tronc', () => {
  // Tronc de x = -10 à 10 ; le bras part du creux C (10, 34), pend vers (22, 8) et remonte à l'épaule.
  const body: Point2[] = [
    [-10, 0],
    [10, 0],
    [10, 34],
    [22, 8],
    [26, 10],
    [14, 36],
    [10, 46],
    [-10, 46],
  ];
  const solid = prism(body, 6, (a, b, c) => [a, b, c]);

  it('trouve le niveau où le bras rejoint le tronc, au centre du creux', () => {
    const p = armpitPoint(solid.pos, solid.tris, 1, [14, 38, 3]);
    expect(p[1]).toBeCloseTo(34, 1);
    expect(p[0]).toBeGreaterThan(9.9);
    expect(p[0]).toBeLessThan(10.2);
    expect(p[2]).toBeCloseTo(3, 1);
  });

  it('lit le côté droit comme le miroir du côté gauche', () => {
    const flipped = prism(mirrored(body), 6, (a, b, c) => [a, b, c]);
    const left = armpitPoint(solid.pos, solid.tris, 1, [14, 38, 3]);
    const right = armpitPoint(flipped.pos, flipped.tris, -1, [-14, 38, 3]);
    // la dichotomie s'arrête à 0,06 mm du creux : le milieu de l'écart restant bouge de moins de 0,05 mm
    expect(right[0]).toBeCloseTo(-left[0], 2);
    expect(right[1]).toBeCloseTo(left[1], 2);
    expect(right[2]).toBeCloseTo(left[2], 2);
  });

  it('signale un bras jamais séparé du tronc', () => {
    const box = prism(
      [
        [-10, 0],
        [10, 0],
        [10, 46],
        [-10, 46],
      ],
      6,
      (a, b, c) => [a, b, c],
    );
    expect(() => armpitPoint(box.pos, box.tris, 1, [14, 38, 3])).toThrow(/aisselle/);
  });
});

describe('fourche : chemin dans le plan sagittal', () => {
  // Coupe sagittale (z, y) du bassin : devant à z = 10, dos à z = -10, arche plate entre les jambes à y = 10.
  const section: Point2[] = [
    [-10, 40],
    [-10, 30],
    [-8, 14],
    [-2, 10],
    [4, 10],
    [6, 14],
    [10, 30],
    [10, 40],
  ];
  const solid = prism(section, 20, (a, b, c) => [c - 10, b, a]);
  const total = Math.hypot(4, 16) + Math.hypot(2, 4) + 6 + Math.hypot(6, 4) + Math.hypot(2, 16);

  it('mesure le chemin de la taille devant à la taille dos et place la fourche au milieu de l’arche', () => {
    const path = crotchPath(solid.pos, solid.tris, 30);
    expect(path.totalCm).toBeCloseTo(total, 3);
    // devant : taille, flanc, puis la moitié de l'arche plate (3 cm)
    expect(path.frontCm).toBeCloseTo(Math.hypot(4, 16) + Math.hypot(2, 4) + 3, 3);
    expect(path.point[1]).toBeCloseTo(10, 3);
    expect(path.point[2]).toBeCloseTo(1, 3);
  });

  it('ne dépend pas du sens de parcours du contour : le devant est le côté z > 0', () => {
    const reversed = prism(section.slice().reverse(), 20, (a, b, c) => [c - 10, b, a]);
    const path = crotchPath(reversed.pos, reversed.tris, 30);
    expect(path.totalCm).toBeCloseTo(total, 3);
    expect(path.frontCm).toBeCloseTo(Math.hypot(4, 16) + Math.hypot(2, 4) + 3, 3);
  });

  it('une taille plus basse raccourcit le chemin des deux côtés', () => {
    const higher = crotchPath(solid.pos, solid.tris, 30);
    const lower = crotchPath(solid.pos, solid.tris, 20);
    expect(lower.totalCm).toBeLessThan(higher.totalCm);
    expect(lower.frontCm).toBeLessThan(higher.frontCm);
  });

  it('signale un contour qui ne monte pas jusqu’à la taille', () => {
    expect(() => crotchPath(solid.pos, solid.tris, 80)).toThrow(/fourche/);
  });
});

describe('lecture du corps : zones absentes', () => {
  const pivots: { left: Vec3; right: Vec3 } = { left: [0, 0, 0], right: [0, 0, 0] };
  const input = (measured: Record<string, unknown>) => ({
    pos: new Float32Array(0),
    tris: new Uint16Array(0),
    measured: measured as unknown as Measured,
    pivots,
  });
  const ring = { center: [0, 100, 0] };

  it("signale une zone de mesure absente au lieu d'écrire 0", () => {
    expect(() => readBody(input({ rings: { hip: ring, knee: ring }, crotch: 80 }))).toThrow(
      /waist/,
    );
    expect(() => readBody(input({ rings: { waist: ring, knee: ring }, crotch: 80 }))).toThrow(
      /hip/,
    );
  });

  it("signale un entrejambe absent au lieu d'écrire 0", () => {
    const rings = { waist: ring, hip: ring, knee: ring };
    expect(() => readBody(input({ rings }))).toThrow(/crotch/);
  });
});
