import type { Edge, Panel, Point } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  DrapeTooLargeError,
  FLATNESS_RATIO,
  InvalidInputError,
  MAX_EDGES_PER_GARMENT,
  MAX_EDGE_RATIO,
  MAX_VERTICES_PER_GARMENT,
  MESH_EDGE_MM,
  assertWithinDrapeLimits,
  flattenPanelOutline,
  meshPanel,
} from '../src/index.js';
import {
  distToSegment,
  panelOf,
  polygonPanel,
  rectPanel,
  sameBitsOf,
  vertexAt,
} from './mesh-helpers.js';

const PENTAGON: Point[] = [
  [0, 0],
  [300, 0],
  [300, 200],
  [100, 400],
  [0, 400],
];

describe('contour rééchantillonné', () => {
  it('découpe un bord droit en parts égales de 1,2 h au plus', () => {
    const h = 25;
    for (const length of [10, 25, 37, 37.6, 100, 333.3]) {
      const panel = polygonPanel([
        [0, 0],
        [length, 0],
        [length, 100],
      ]);
      const { pointsMm, edgeStarts } = flattenPanelOutline(panel, h);
      const n = (edgeStarts[1] as number) - (edgeStarts[0] as number);
      for (let i = 0; i < n; i++) {
        const a = pointsMm[2 * i] as number;
        const b = i + 1 < n ? (pointsMm[2 * i + 2] as number) : length;
        expect(b - a).toBeLessThanOrEqual(MAX_EDGE_RATIO * h + 1e-9);
        expect(b - a).toBeCloseTo(length / n, 9);
      }
    }
  });

  it('renvoie un indice de départ par bord, sans répéter le premier point', () => {
    const { pointsMm, edgeStarts } = flattenPanelOutline(rectPanel(100, 50), 25);
    expect(Array.from(edgeStarts)).toEqual([0, 4, 6, 10]);
    expect(pointsMm.length / 2).toBe(12);
  });

  it('refuse un contour ouvert, un bord sans longueur, un pas non positif', () => {
    const open = rectPanel(100, 50);
    (open.edges[1] as Edge).to = [100, 80];
    expect(() => flattenPanelOutline(open, 25)).toThrow(InvalidInputError);
    const flat = polygonPanel([
      [0, 0],
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(() => flattenPanelOutline(flat, 25)).toThrow(InvalidInputError);
    expect(() => flattenPanelOutline(rectPanel(10, 10), 0)).toThrow(InvalidInputError);
  });

  it('courbe serrée : la flèche reste sous h/20 en subdivisant davantage', () => {
    const h = 25;
    const edges: Edge[] = [
      {
        id: 'a',
        from: [0, 0],
        to: [60, 0],
        controls: [
          [0, 80],
          [60, 80],
        ],
      },
      { id: 'b', from: [60, 0], to: [0, 0] },
    ];
    const panel = panelOf('p', edges);
    const { pointsMm, edgeStarts } = flattenPanelOutline(panel, h);
    const n = edgeStarts[1] as number;
    expect(n).toBeGreaterThan(Math.round(150 / h));
    const pts: Point[] = Array.from({ length: n }, (_, i) => [
      pointsMm[2 * i] as number,
      pointsMm[2 * i + 1] as number,
    ]);
    pts.push([60, 0]);
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const mt = 1 - t;
      const q: Point = [
        3 * mt * t * t * 60 + t * t * t * 60,
        3 * mt * mt * t * 80 + 3 * mt * t * t * 80,
      ];
      const d = Math.min(
        ...pts.slice(0, -1).map((p, j) => distToSegment(q, p, pts[j + 1] as Point)),
      );
      expect(d).toBeLessThanOrEqual(FLATNESS_RATIO * h + 1e-6);
    }
  });
});

describe('correspondance bords du contrat et sommets', () => {
  const panel = polygonPanel(PENTAGON);
  const mesh = meshPanel(panel, 'standard');

  it('donne à chaque bord ses sommets, de from à to', () => {
    expect(mesh.boundary).toHaveLength(panel.edges.length);
    mesh.boundary.forEach((b, i) => {
      const edge = panel.edges[i] as Edge;
      expect(b.edgeIndex).toBe(i);
      const first = vertexAt(mesh, b.vertexIndices[0] as number);
      const last = vertexAt(mesh, b.vertexIndices[b.vertexIndices.length - 1] as number);
      expect(first).toEqual(edge.from);
      expect(Math.hypot(last[0] - edge.to[0], last[1] - edge.to[1])).toBeLessThan(1e-9);
      expect(b.vertexIndices.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('partage les extrémités entre bords consécutifs, le dernier revenant au sommet 0', () => {
    mesh.boundary.forEach((b, i) => {
      const following = mesh.boundary[(i + 1) % mesh.boundary.length];
      expect(b.vertexIndices[b.vertexIndices.length - 1]).toBe(following?.vertexIndices[0]);
    });
    expect(mesh.boundary[0]?.vertexIndices[0]).toBe(0);
  });

  it('place les sommets de chaque bord sur ce bord, à pas régulier', () => {
    mesh.boundary.forEach((b, i) => {
      const edge = panel.edges[i] as Edge;
      const pts = Array.from(b.vertexIndices, (v) => vertexAt(mesh, v));
      pts.forEach((p) => expect(distToSegment(p, edge.from, edge.to)).toBeLessThan(1e-9));
      const steps = pts
        .slice(1)
        .map((p, j) => Math.hypot(p[0] - (pts[j] as Point)[0], p[1] - (pts[j] as Point)[1]));
      steps.forEach((s) => expect(s).toBeCloseTo(steps[0] as number, 9));
    });
  });

  it('fait de chaque segment de bord une arête de triangle', () => {
    const has = new Set<string>();
    for (let t = 0; t < mesh.triangles.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        has.add(`${mesh.triangles[t + k]}-${mesh.triangles[t + ((k + 1) % 3)]}`);
      }
    }
    for (const b of mesh.boundary) {
      for (let i = 0; i + 1 < b.vertexIndices.length; i++) {
        const [u, v] = [b.vertexIndices[i], b.vertexIndices[i + 1]];
        expect(has.has(`${u}-${v}`) || has.has(`${v}-${u}`)).toBe(true);
      }
    }
  });
});

describe('déterminisme', () => {
  it('donne les mêmes bits à chaque appel', () => {
    const panel = polygonPanel(PENTAGON);
    const a = meshPanel(panel, 'draft');
    const b = meshPanel(JSON.parse(JSON.stringify(panel)) as Panel, 'draft');
    expect(sameBitsOf(a.positionsMm, b.positionsMm)).toBe(true);
    expect(Array.from(a.triangles)).toEqual(Array.from(b.triangles));
  });
});

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('limites', () => {
  it('expose les limites du vêtement et les pas', () => {
    expect(MAX_EDGES_PER_GARMENT).toBe(2000);
    expect(MAX_VERTICES_PER_GARMENT).toBe(30000);
    expect(MESH_EDGE_MM).toEqual({ draft: 25, standard: 15 });
  });

  it('lève drape-too-large au-delà de 2 000 bords', () => {
    const points: Point[] = Array.from({ length: 2001 }, (_, i) => {
      const a = (2 * Math.PI * i) / 2001;
      return [5000 + 4000 * Math.cos(a), 5000 + 4000 * Math.sin(a)];
    });
    const err = catchError(() => meshPanel(polygonPanel(points), 'draft'));
    expect(err).toBeInstanceOf(DrapeTooLargeError);
    expect((err as DrapeTooLargeError).code).toBe('drape-too-large');
    expect(err).toBeInstanceOf(RangeError);
  });

  it('lève drape-too-large au-delà de 30 000 sommets', () => {
    const err = catchError(() => meshPanel(rectPanel(5000, 5000), 'draft'));
    expect(err).toBeInstanceOf(DrapeTooLargeError);
  });

  it("vérifie les totaux d'un vêtement", () => {
    expect(() => assertWithinDrapeLimits(2000, 30000)).not.toThrow();
    expect(() => assertWithinDrapeLimits(2001, 0)).toThrow(DrapeTooLargeError);
    expect(() => assertWithinDrapeLimits(0, 30001)).toThrow(DrapeTooLargeError);
  });
});
