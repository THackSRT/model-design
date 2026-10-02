import type { GarmentSpec } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { toZones } from '../src/garment/dress.js';
import { buildMesh } from '../src/garment/mesh.js';
import {
  circleProfile,
  crotchLevel,
  edgeLength,
  flatPanels,
  girthAt,
  widthAt,
  type Point,
} from '../src/garment/pattern.js';
import { directions, perimeter, solveRing } from '../src/garment/ring.js';
import { createSectioner } from '../src/garment/section.js';

type Edge = GarmentSpec['panels'][number]['edges'][number];

/** Contour fermé à partir de points : un bord droit par côté. */
function edgesOf(points: Point[], roles: Record<number, Edge['role']> = {}): Edge[] {
  return points.map((p, i) => {
    const edge: Edge = { id: `e${i}`, from: p, to: points[(i + 1) % points.length] as Point };
    const role = roles[i];
    if (role) edge.role = role;
    return edge;
  });
}

function specOf(panels: { id: string; points: Point[]; fold?: boolean; quantity?: number }[]) {
  return {
    specVersion: '1.0',
    unit: 'mm',
    engine: { name: 'test', version: '0' },
    garment: { type: 'straight-skirt' },
    panels: panels.map((p) => ({
      id: p.id,
      name: p.id,
      edges: edgesOf(p.points),
      quantity: p.quantity ?? 1,
      cutOnFold: p.fold ?? false,
    })),
    seams: [],
  } as unknown as GarmentSpec;
}

const RECT: Point[] = [
  [0, 0],
  [100, 0],
  [100, 200],
  [0, 200],
];
/** Rectangle de 100 mm avec une pince : échancrure de 10 mm de large, en haut, jusqu'à y = 100. */
const DARTED: Point[] = [
  [0, 0],
  [100, 0],
  [100, 200],
  [55, 200],
  [50, 100],
  [45, 200],
  [0, 200],
];

describe('patron : largeurs et tour fini', () => {
  it("mesure la largeur d'une pièce à une hauteur", () => {
    expect(widthAt(RECT, 50)).toBeCloseTo(100, 9);
    expect(widthAt(RECT, 250)).toBe(0);
  });

  it("retire l'ouverture d'une pince à sa hauteur (les pinces sont cousues)", () => {
    expect(widthAt(DARTED, 199)).toBeCloseTo(100 - 10 * (99 / 100), 6);
    expect(widthAt(DARTED, 50)).toBeCloseTo(100, 9);
  });

  it('double une pièce coupée sur le pli et multiplie par la quantité', () => {
    const panels = flatPanels(
      specOf([
        { id: 'front', points: RECT, fold: true },
        { id: 'back-right', points: RECT },
        { id: 'back-left', points: RECT, quantity: 2 },
      ]),
    );
    expect(girthAt(panels, 100)).toBeCloseTo(200 + 100 + 200, 9);
  });

  it("lit une jambe par côté d'après le nom des pièces", () => {
    const panels = flatPanels(
      specOf([
        { id: 'front-left', points: RECT },
        { id: 'back-left', points: RECT },
        { id: 'front-right', points: RECT.map(([x, y]): Point => [x * 2, y]) },
      ]),
    );
    expect(girthAt(panels, 100, 'left')).toBeCloseTo(200, 9);
    expect(girthAt(panels, 100, 'right')).toBeCloseTo(200, 9);
    expect(girthAt(panels, 100)).toBeCloseTo(400, 9);
  });

  it('ignore les manches et les ceintures', () => {
    const panels = flatPanels(
      specOf([
        { id: 'front', points: RECT },
        { id: 'sleeve', points: RECT },
        { id: 'waistband-front', points: RECT },
      ]),
    );
    expect(panels.map((p) => p.id)).toEqual(['front']);
  });

  it('aplatit une courbe de Bézier et en donne la longueur', () => {
    const edge: Edge = {
      id: 'c',
      from: [0, 0],
      to: [100, 0],
      controls: [
        [0, 100],
        [100, 100],
      ],
    };
    expect(edgeLength(edge)).toBeGreaterThan(100);
    expect(edgeLength({ id: 's', from: [0, 0], to: [30, 40] })).toBeCloseTo(50, 9);
  });

  it("lit une jupe cercle en arcs : tours de taille et d'ourlet, longueur", () => {
    const spec = {
      panels: [
        {
          id: 'front',
          name: 'front',
          quantity: 1,
          cutOnFold: false,
          edges: [
            { id: 'hem-1', role: 'hem', from: [0, 0], to: [400, 0] },
            { id: 'side-right', role: 'seam', from: [400, 0], to: [400, 300] },
            { id: 'waist-1', role: 'seam', from: [400, 300], to: [100, 300] },
            { id: 'side-left', role: 'seam', from: [100, 300], to: [0, 0] },
          ],
        },
      ],
    } as unknown as GarmentSpec;
    expect(circleProfile(spec)).toEqual({ lengthMm: 300, waistGirthMm: 300, hemGirthMm: 400 });
    expect(circleProfile({ panels: [] } as unknown as GarmentSpec)).toBeUndefined();
  });

  it("repère le niveau d'entrejambe du patron", () => {
    const spec = {
      panels: [
        {
          id: 'a',
          name: 'a',
          quantity: 1,
          edges: [{ id: 'inseam-upper', from: [0, 700], to: [1, 1] }],
        },
        {
          id: 'b',
          name: 'b',
          quantity: 1,
          edges: [{ id: 'inseam-upper', from: [0, 740], to: [1, 1] }],
        },
      ],
    } as unknown as GarmentSpec;
    expect(crotchLevel(spec)).toBe(720);
    expect(crotchLevel({ panels: [] } as unknown as GarmentSpec)).toBeUndefined();
  });
});

describe('anneau : agrandissement de la section du corps', () => {
  const dirs = directions(96);
  const circle = (r: number): [number, number][] =>
    Array.from({ length: 200 }, (_, i): [number, number] => [
      r * Math.cos((2 * Math.PI * i) / 200),
      r * Math.sin((2 * Math.PI * i) / 200),
    ]);

  it('atteint le tour demandé et reste à au moins la distance d du corps', () => {
    const solved = solveRing(circle(10), dirs, 80);
    expect(perimeter(solved.points)).toBeCloseTo(80, 3);
    expect(solved.shortfallCm).toBe(0);
    for (const p of solved.points) expect(Math.hypot(p[0], p[1])).toBeGreaterThan(10);
  });

  it('tend vers un cercle quand le tour grandit (jupe évasée)', () => {
    const ellipse = Array.from({ length: 200 }, (_, i): [number, number] => [
      15 * Math.cos((2 * Math.PI * i) / 200),
      5 * Math.sin((2 * Math.PI * i) / 200),
    ]);
    const radii = (cm: number): number[] =>
      solveRing(ellipse, dirs, cm).points.map((p) => Math.hypot(p[0], p[1]));
    const ratio = (r: number[]): number => Math.max(...r) / Math.min(...r);
    expect(ratio(radii(2000))).toBeLessThan(1.05);
    expect(ratio(radii(2000))).toBeLessThan(ratio(radii(100)));
  });

  it("colle l'anneau au corps et donne l'écart quand le tour demandé est trop petit", () => {
    const solved = solveRing(circle(10), dirs, 50);
    expect(solved.shortfallCm).toBeCloseTo(solved.bodyGirthCm - 50, 9);
    expect(solved.shortfallCm).toBeGreaterThan(10);
    for (const p of solved.points) expect(Math.hypot(p[0], p[1])).toBeGreaterThanOrEqual(10 - 0.01);
  });
});

describe('coupes du corps', () => {
  /** Deux cylindres verticaux de rayon 5 (x = ±10) sur 0..40 cm, ouverts. */
  function twoCylinders(): { pos: number[]; index: number[] } {
    const pos: number[] = [];
    const index: number[] = [];
    const segments = 12;
    for (const cx of [-10, 10]) {
      const base = pos.length / 3;
      for (const y of [0, 20, 40]) {
        for (let i = 0; i < segments; i++) {
          const a = (2 * Math.PI * i) / segments;
          pos.push(cx + 5 * Math.cos(a), y, 5 * Math.sin(a));
        }
      }
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < segments; i++) {
          const a = base + r * segments + i;
          const b = base + r * segments + ((i + 1) % segments);
          index.push(a, b, a + segments, b, b + segments, a + segments);
        }
      }
    }
    return { pos, index };
  }

  it('sépare deux solides disjoints en deux composantes', () => {
    const { pos, index } = twoCylinders();
    const parts = createSectioner(pos, index).at(10);
    expect(parts).toHaveLength(2);
    expect(parts.map((p) => Math.round(p.center[0])).sort((a, b) => a - b)).toEqual([-10, 10]);
    expect(parts[0]?.area).toBeCloseTo(75, 3);
  });

  it('ne rend rien hors du maillage', () => {
    const { pos, index } = twoCylinders();
    expect(createSectioner(pos, index).at(60)).toEqual([]);
  });
});

describe('zones trop justes', () => {
  it('regroupe les hauteurs contiguës et garde le plus grand écart', () => {
    const zones = toZones(
      [
        { hMm: 1000, shortfallMm: 5 },
        { hMm: 1010, shortfallMm: 12 },
        { hMm: 1020, shortfallMm: 7 },
        { hMm: 800, shortfallMm: 3 },
      ],
      10,
    );
    expect(zones).toEqual([
      { fromMm: 800, toMm: 800, shortfallMm: 3 },
      { fromMm: 1000, toMm: 1020, shortfallMm: 12 },
    ]);
  });

  it('ne rend aucune zone sans hauteur trop juste', () => {
    expect(toZones([], 10)).toEqual([]);
  });
});

describe('maillage des tubes', () => {
  const ring = (y: number): { yCm: number; points: [number, number][] } => ({
    yCm: y,
    points: [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ],
  });

  it('tourne les normales vers l’extérieur et ferme un tube par un disque tourné vers le bas', () => {
    const mesh = buildMesh([{ rings: [ring(2), ring(1)], closed: true }]);
    expect(mesh.positions).toHaveLength((8 + 1) * 3);
    expect(mesh.index).toHaveLength((8 + 4) * 3);
    for (let v = 0; v < 8; v++) {
      const dot =
        (mesh.normals[3 * v] as number) * (mesh.positions[3 * v] as number) +
        (mesh.normals[3 * v + 2] as number) * (mesh.positions[3 * v + 2] as number);
      expect(dot).toBeGreaterThan(0);
    }
    expect(mesh.normals[3 * 8 + 1] as number).toBeLessThan(0);
  });
});
