import type { Edge, Panel, Point } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  InvalidInputError,
  MAX_EDGE_RATIO,
  MESH_EDGE_MM,
  meshPanel,
  type PanelMesh,
} from '../src/index.js';
import { meshStats, panelOf, polygonArea, polygonPanel, rng, vertexAt } from './mesh-helpers.js';

/** Aire du contour tel que maillé (ligne brisée des sommets de bord). */
function outlineArea(mesh: PanelMesh): number {
  const pts = mesh.boundary.flatMap((b) =>
    Array.from(b.vertexIndices.subarray(0, b.vertexIndices.length - 1), (v) => vertexAt(mesh, v)),
  );
  return polygonArea(pts);
}

function expectFilled(mesh: PanelMesh, expectedArea: number, h: number): void {
  const s = meshStats(mesh);
  expect(Math.abs(s.area - expectedArea) / expectedArea).toBeLessThan(1e-3);
  expect(Math.abs(s.area - outlineArea(mesh)) / expectedArea).toBeLessThan(1e-9);
  expect(s.minTriangleArea).toBeGreaterThan(0);
  expect(s.maxEdge).toBeLessThanOrEqual(MAX_EDGE_RATIO * h + 1e-9);
  expect(s.usedVertices).toBe(mesh.positionsMm.length / 2);
}

const L: Point[] = [
  [0, 0],
  [400, 0],
  [400, 150],
  [150, 150],
  [150, 500],
  [0, 500],
];

/** Pièce rectangulaire 300 x 500 avec une pince en creux (triangle étroit ouvert sur le haut). */
const DART: Point[] = [
  [0, 0],
  [300, 0],
  [300, 500],
  [170, 500],
  [150, 150],
  [130, 500],
  [0, 500],
];

describe('pièces non convexes', () => {
  it.each(['draft', 'standard'] as const)('pièce en L, qualité %s', (q) => {
    const mesh = meshPanel(polygonPanel(L), q);
    expectFilled(mesh, 400 * 150 + 150 * 350, MESH_EDGE_MM[q]);
    expect(meshStats(mesh).minAngleDeg).toBeGreaterThan(15);
  });

  it.each(['draft', 'standard'] as const)('pièce à pince en creux, qualité %s', (q) => {
    const mesh = meshPanel(polygonPanel(DART), q);
    expectFilled(mesh, polygonArea(DART), MESH_EDGE_MM[q]);
  });

  it("n'a aucun triangle hors de la pièce (pince)", () => {
    const mesh = meshPanel(polygonPanel(DART), 'standard');
    // Le centre de chaque triangle est dans la pièce (règle pair-impair).
    for (let t = 0; t < mesh.triangles.length; t += 3) {
      const c = [0, 1, 2]
        .map((k) => vertexAt(mesh, mesh.triangles[t + k] as number))
        .reduce<Point>((s, p) => [s[0] + p[0] / 3, s[1] + p[1] / 3], [0, 0]);
      expect(inside(DART, c)).toBe(true);
    }
  });
});

function inside(poly: readonly Point[], p: Point): boolean {
  let r = false;
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length] as Point;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1])
    ) {
      r = !r;
    }
  });
  return r;
}

describe('propriétés sur des pièces tirées au sort (graine fixe)', () => {
  it('étoiles simples : aire du contour conservée, pas de triangle inversé', () => {
    const rand = rng(2024);
    for (let n = 0; n < 12; n++) {
      const count = 5 + Math.floor(rand() * 8);
      const pts: Point[] = [];
      for (let i = 0; i < count; i++) {
        const angle = ((i + rand() * 0.6) / count) * 2 * Math.PI;
        const r = 150 + rand() * 150;
        pts.push([500 + r * Math.cos(angle), 500 + r * Math.sin(angle)]);
      }
      const quality = n % 2 === 0 ? 'draft' : 'standard';
      const mesh = meshPanel(polygonPanel(pts), quality);
      const s = meshStats(mesh);
      expect(Math.abs(s.area - outlineArea(mesh)) / s.area).toBeLessThan(1e-9);
      expect(s.minTriangleArea).toBeGreaterThan(0);
      expect(s.maxEdge).toBeLessThanOrEqual(MAX_EDGE_RATIO * MESH_EDGE_MM[quality] + 1e-9);
    }
  });
});

describe('bord courbe', () => {
  const h = MESH_EDGE_MM.standard;
  const curve = (radius: number): Panel => {
    const k = 0.5522847498 * radius; // quart de cercle en Bézier cubique
    const edges: Edge[] = [
      { id: 'bottom', from: [0, 0], to: [300, 0] },
      { id: 'right', from: [300, 0], to: [300, 300] },
      {
        id: 'arc',
        from: [300, 300],
        to: [300 - radius, 300 + radius],
        controls: [
          [300, 300 + k],
          [300 - radius + k, 300 + radius],
        ],
      },
      { id: 'top', from: [300 - radius, 300 + radius], to: [0, 300 + radius] },
      { id: 'left', from: [0, 300 + radius], to: [0, 0] },
    ];
    return panelOf('c', edges);
  };

  it.each([40, 150])("l'écart à la courbe reste sous h/20 (rayon %s mm)", (radius) => {
    const panel = curve(radius);
    const mesh = meshPanel(panel, 'standard');
    const verts = (mesh.boundary[2] as PanelMesh['boundary'][number]).vertexIndices;
    const poly = Array.from(verts, (v) => vertexAt(mesh, v));
    // sommets sur le cercle de centre (300 - radius ... ) : (300, 300) est le point bas du quart de cercle
    const center: Point = [300 - radius, 300];
    for (const p of poly)
      expect(Math.abs(Math.hypot(p[0] - center[0], p[1] - center[1]) - radius)).toBeLessThan(0.05);
    for (let i = 0; i <= 2000; i++) {
      const a = (i / 2000) * (Math.PI / 2);
      const q: Point = [center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)];
      const d = Math.min(...poly.slice(0, -1).map((p, j) => distToSeg(q, p, poly[j + 1] as Point)));
      expect(d).toBeLessThanOrEqual(h / 20 + 1e-6);
    }
    expectFilled(mesh, 300 * 300 + 300 * radius - ((4 - Math.PI) * radius * radius) / 4, h);
  });
});

function distToSeg(p: Point, a: Point, b: Point): number {
  const [ex, ey] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.min(
    1,
    Math.max(0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey)),
  );
  return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey);
}

describe('contours invalides', () => {
  it('refuse un contour qui se croise', () => {
    const bowtie = polygonPanel([
      [0, 0],
      [100, 100],
      [100, 0],
      [0, 100],
    ]);
    expect(() => meshPanel(bowtie, 'draft')).toThrow(InvalidInputError);
  });
});
