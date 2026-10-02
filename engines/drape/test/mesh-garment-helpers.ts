import type { GarmentSpec, Panel, Point, Seam } from '@atelier/contracts-ts';
import type { GarmentMesh } from '../src/index.js';

export function specOf(panels: Panel[], seams: Seam[] = []): GarmentSpec {
  return {
    specVersion: '1.0',
    unit: 'mm',
    engine: { name: 'test', version: '0' },
    garment: { type: 'test' },
    panels: panels as GarmentSpec['panels'],
    seams,
  };
}

export const withPlacement = (
  panel: Panel,
  bodySide: 'left' | 'right' | 'center',
  facing: 'front' | 'back' | 'outer' = 'front',
): Panel => ({
  ...panel,
  placement: {
    zone: 'torso',
    bodySide,
    facing,
    anchor: { point: [0, 0], landmark: 'waist' },
  },
});

/** Aire signée d'un triangle (à plat). */
export function triArea(g: GarmentMesh, t: number): number {
  const { flatMm, triangles } = g.cloth;
  const [a, b, c] = [0, 1, 2].map((k) => (triangles[3 * t + k] as number) * 2) as [
    number,
    number,
    number,
  ];
  const f = (i: number): number => flatMm[i] as number;
  return ((f(b) - f(a)) * (f(c + 1) - f(a + 1)) - (f(b + 1) - f(a + 1)) * (f(c) - f(a))) / 2;
}

export function totalArea(g: GarmentMesh, piece: number): number {
  const p = g.pieces[piece] as GarmentMesh['pieces'][number];
  let s = 0;
  for (let t = p.triangleStart; t < p.triangleStart + p.triangleCount; t++) s += triArea(g, t);
  return s;
}

export const pointAt = (g: GarmentMesh, v: number): Point => [
  g.cloth.flatMm[2 * v] as number,
  g.cloth.flatMm[2 * v + 1] as number,
];
