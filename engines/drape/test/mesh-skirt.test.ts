import type { GarmentSpec, Panel, Point } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { meshPanel, type MeshQuality, type PanelMesh } from '../src/index.js';
import { validateCloth } from '../src/core/validate.js';
import type { ClothMesh } from '../src/core/types.js';
import skirt from './fixtures/straight-skirt.json' with { type: 'json' };
import { costRatio } from './helpers.js';
import { meshStats, polygonArea, vertexAt } from './mesh-helpers.js';

// Fixture : copie de engines/patterning/tests/golden/straight-skirt-reference.json (jupe droite du moteur de
// patronage, 3 pièces dont une sur pliure et des pinces en creux).
const spec = skirt as unknown as GarmentSpec;

/** Relève un maillage à plat en 3D (x, y = 0, z = y à plat) pour la validation du cœur. */
function lift(mesh: PanelMesh): ClothMesh {
  const n = mesh.positionsMm.length / 2;
  const positionsMm = new Float64Array(3 * n);
  for (let v = 0; v < n; v++) {
    positionsMm[3 * v] = mesh.positionsMm[2 * v] as number;
    positionsMm[3 * v + 2] = mesh.positionsMm[2 * v + 1] as number;
  }
  const grainUnit = new Float64Array((2 * mesh.triangles.length) / 3);
  for (let t = 0; t < grainUnit.length; t += 2) grainUnit[t + 1] = 1;
  return {
    positionsMm,
    flatMm: mesh.positionsMm,
    triangles: mesh.triangles,
    grainUnit,
    stitches: new Uint32Array(0),
  };
}

/** Aire de la pièce avec ses bords courbes finement échantillonnés (Bézier, 200 pas). */
function panelPolygonArea(panel: Panel): number {
  const pts: Point[] = [];
  for (const e of panel.edges) {
    const ctrl: Point[] = [e.from, ...(e.controls ?? []), e.to];
    for (let i = 0; i < 200; i++) pts.push(bezier(ctrl, i / 200));
  }
  return polygonArea(pts);
}

function bezier(ctrl: Point[], t: number): Point {
  let cur = ctrl;
  while (cur.length > 1) {
    cur = cur.slice(1).map((q, i) => {
      const p = cur[i] as Point;
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] as Point;
    });
  }
  return cur[0] as Point;
}

describe.each(['draft', 'standard'] as MeshQuality[])(
  'jupe droite du moteur de patronage, %s',
  (q) => {
    it.each(spec.panels.map((p) => [p.id, p] as const))(
      'pièce %s : maillage valide',
      (_id, panel) => {
        const mesh = meshPanel(panel, q);
        validateCloth(lift(mesh));
        const s = meshStats(mesh);
        expect(s.minTriangleArea).toBeGreaterThan(0);
        expect(s.usedVertices).toBe(mesh.positionsMm.length / 2);
        // Les bords courbes sont aplatis : l'aire du maillage est celle de la ligne brisée, proche de la pièce.
        const expected = panelPolygonArea(panel);
        expect(Math.abs(s.area - expected) / expected).toBeLessThan(0.003);
        expect(s.minAngleDeg).toBeGreaterThan(20);
        expect(mesh.boundary).toHaveLength(panel.edges.length);
        expect(vertexAt(mesh, 0)).toEqual(panel.edges[0]?.from);
      },
    );
  },
);

describe('performance', () => {
  it('maille la jupe droite complète en qualité standard en moins de 1 s CPU', () => {
    spec.panels.forEach((p) => meshPanel(p, 'standard')); // chauffe du compilateur
    const ratio = costRatio(() => spec.panels.forEach((p) => meshPanel(p, 'standard')));
    expect(ratio).toBeLessThan(0.12); // au repos : 0,05 à 0,06
  });
});
