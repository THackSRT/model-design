import type { Edge, GarmentSpec } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { comparePanels } from '../src/design-history/compare.js';
import { measurePanels } from '../src/design-history/panel-metrics.js';
import { spec } from './fakes.js';

const specOf = (...panels: Array<{ id: string; edges: Edge[] }>): GarmentSpec => ({
  ...spec,
  panels: panels.map((p) => ({
    ...p,
    name: p.id,
    quantity: 1,
  })) as unknown as GarmentSpec['panels'],
});

const rectangle = (id: string, width: number, height: number) => ({
  id,
  edges: [
    { id: 'a', from: [0, 0], to: [width, 0] },
    { id: 'b', from: [width, 0], to: [width, height] },
    { id: 'c', from: [width, height], to: [0, height] },
    { id: 'd', from: [0, height], to: [0, 0] },
  ] as Edge[],
});

describe('aire et périmètre des pièces', () => {
  it('rectangle 100 x 50 mm', () => {
    const [metrics] = measurePanels(specOf(rectangle('r', 100, 50)));
    expect(metrics?.areaMm2).toBeCloseTo(5000, 6);
    expect(metrics?.perimeterMm).toBeCloseTo(300, 6);
  });

  it('même aire quel que soit le sens du contour', () => {
    const clockwise = {
      id: 'cw',
      edges: [
        { id: 'a', from: [0, 0], to: [0, 50] },
        { id: 'b', from: [0, 50], to: [100, 50] },
        { id: 'c', from: [100, 50], to: [100, 0] },
        { id: 'd', from: [100, 0], to: [0, 0] },
      ] as Edge[],
    };
    expect(measurePanels(specOf(clockwise))[0]?.areaMm2).toBeCloseTo(5000, 6);
  });

  it('quart de disque de rayon 100 mm (Bézier cubique aplatie)', () => {
    const k = 55.2285;
    const quarter = {
      id: 'q',
      edges: [
        { id: 'a', from: [0, 0], to: [100, 0] },
        {
          id: 'b',
          from: [100, 0],
          to: [0, 100],
          controls: [
            [100, k],
            [k, 100],
          ],
        },
        { id: 'c', from: [0, 100], to: [0, 0] },
      ] as Edge[],
    };
    const [metrics] = measurePanels(specOf(quarter));
    expect(Math.abs((metrics?.areaMm2 ?? 0) - (Math.PI * 100 * 100) / 4)).toBeLessThan(5);
    expect(Math.abs((metrics?.perimeterMm ?? 0) - (200 + (Math.PI * 100) / 2))).toBeLessThan(0.5);
  });

  it('segment de parabole (Bézier quadratique) : deux tiers de base x hauteur', () => {
    const arch = {
      id: 'p',
      edges: [
        { id: 'a', from: [0, 0], to: [100, 0], controls: [[50, 100]] },
        { id: 'b', from: [100, 0], to: [0, 0] },
        { id: 'c', from: [0, 0], to: [0, 0] },
      ] as Edge[],
    };
    // Le contour revient au départ par le bord b ; c est de longueur nulle.
    expect(
      Math.abs((measurePanels(specOf(arch))[0]?.areaMm2 ?? 0) - (2 / 3) * 100 * 50),
    ).toBeLessThan(1);
  });
});

describe('comparaison des pièces', () => {
  it('rapproche par id, calcule les écarts, signale ajoutées et retirées', () => {
    const before = specOf(rectangle('same', 100, 50), rectangle('gone', 10, 10));
    const after = specOf(rectangle('same', 110, 50), rectangle('added', 20, 20));
    const rows = comparePanels({ spec: before }, { spec: after });
    expect(rows.map((r) => r.id)).toEqual(['same', 'gone', 'added']);
    expect(rows[0]?.areaDeltaMm2).toBeCloseTo(500, 6);
    expect(rows[0]?.perimeterDeltaMm).toBeCloseTo(20, 6);
    expect(rows[1]?.to).toBeUndefined();
    expect(rows[1]?.areaDeltaMm2).toBeUndefined();
    expect(rows[2]?.from).toBeUndefined();
    expect(rows[2]?.to?.areaMm2).toBeCloseTo(400, 6);
  });
});
