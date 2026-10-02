import type { Edge, Panel, Seam } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { edgeSampling, meshGarment, meshPanel, type GarmentMesh } from '../src/index.js';
import { InvalidInputError } from '../src/core/validate.js';
import { pointAt, specOf, totalArea, withPlacement } from './mesh-garment-helpers.js';
import { polygonPanel, rectPanel } from './mesh-helpers.js';

describe('couture de deux bords de longueurs différentes', () => {
  // A : rectangle 100 × 100, bord droit e1 (de bas en haut, 100 mm). B : 50 × 130, bord gauche e3 (de haut en bas,
  // 130 mm).
  const a = polygonPanel(
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
    'A',
  );
  const b = polygonPanel(
    [
      [0, 0],
      [50, 0],
      [50, 130],
      [0, 130],
    ],
    'B',
  );
  const spec = specOf(
    [a, b],
    [
      {
        id: 's',
        a: { panelId: 'A', edgeId: 'e1' },
        b: { panelId: 'B', edgeId: 'e3' },
        easeMm: 0,
      },
    ],
  );

  it('donne le même nombre de points aux deux bords et les apparie en sens opposés', () => {
    const g = meshGarment(spec, 'draft');
    const r = g.seams[0] as GarmentMesh['seams'][number];
    // n = ceil(130 / 25) = 6 segments, soit 7 couples
    expect(r.stitchCount).toBe(7);
    expect(r.lengthAMm).toBeCloseTo(100, 6);
    expect(r.lengthBMm).toBeCloseTo(130, 6);
    expect(r.mismatchMm).toBeCloseTo(30, 6);
    for (let k = 0; k < 7; k++) {
      const va = g.cloth.stitches[2 * k] as number;
      const vb = g.cloth.stitches[2 * k + 1] as number;
      // a monte de 0 à 100, b descend de 130 à 0 (sens opposés) : le rang i de a rejoint le rang n − i de b,
      // soit la même fraction de hauteur
      expect(pointAt(g, va)[1] / 100).toBeCloseTo(pointAt(g, vb)[1] / 130, 9);
    }
    // les deux bords ont des points à pas égaux : 100 / 6 et 130 / 6
    expect(pointAt(g, g.cloth.stitches[2] as number)[1]).toBeCloseTo(100 / 6, 6);
  });

  it("un bord sans couture garde le pas h : l'autre bord de A en a plus ou moins", () => {
    const free = meshPanel(a, 'draft');
    const sewn = meshGarment(spec, 'draft');
    const piece = sewn.pieces[0] as GarmentMesh['pieces'][number];
    // bord e1 : 4 parts seul, 6 parts cousu ; les autres bords sont identiques (même nombre de sommets de contour)
    expect(piece.vertexCount).toBeGreaterThan(free.positionsMm.length / 2);
  });

  it("l'option edgeSegments de meshPanel impose le nombre de parts d'un bord", () => {
    const mesh = meshPanel(a, 'draft', { edgeSegments: new Map([[1, 9]]) });
    expect(mesh.boundary[1]?.vertexIndices).toHaveLength(10);
    expect(mesh.boundary[0]?.vertexIndices).toHaveLength(5);
    expect(() => meshPanel(a, 'draft', { edgeSegments: new Map([[1, 0]]) })).toThrow(
      InvalidInputError,
    );
    expect(edgeSampling(a.edges[1] as Edge, 25)).toEqual({ lengthMm: 100, segments: 4 });
  });

  it('groupe les bords reliés de proche en proche : même nombre de parts pour tous', () => {
    // A.e1 (100) cousu à B.e3 (130) et à C.e3 (80) : un seul nombre de parts, celui du plus long
    const c = polygonPanel(
      [
        [0, 0],
        [50, 0],
        [50, 80],
        [0, 80],
      ],
      'C',
    );
    const g = meshGarment(
      specOf(
        [a, b, c],
        [
          { id: 's1', a: { panelId: 'A', edgeId: 'e1' }, b: { panelId: 'B', edgeId: 'e3' } },
          { id: 's2', a: { panelId: 'A', edgeId: 'e1' }, b: { panelId: 'C', edgeId: 'e3' } },
        ],
      ),
      'draft',
    );
    expect(g.seams.map((r) => r.stitchCount)).toEqual([7, 7]);
  });
});

describe('pièce coupée sur pliure', () => {
  // Demi-pièce 100 × 200 dont le bord gauche (x = 0) est le pli.
  const half = (): Panel => {
    const p = polygonPanel(
      [
        [0, 0],
        [100, 0],
        [100, 200],
        [0, 200],
      ],
      'F',
    );
    const edges = p.edges.map((e, i) => (i === 3 ? { ...e, role: 'fold' as const } : e));
    return { ...p, edges: edges as Panel['edges'], cutOnFold: true };
  };

  it('est dépliée : aire double à 0,3 %, pli sans sommet en double', () => {
    for (const quality of ['draft', 'standard'] as const) {
      const g = meshGarment(specOf([withPlacement(half(), 'center')]), quality);
      expect(g.pieces).toHaveLength(1);
      expect(g.pieces[0]?.unfolded).toBe(true);
      expect(Math.abs(totalArea(g, 0) - 2 * 100 * 200) / (2 * 100 * 200)).toBeLessThan(0.003);
      const seen = new Set<string>();
      const n = g.cloth.flatMm.length / 2;
      for (let v = 0; v < n; v++) {
        const [x, y] = pointAt(g, v);
        seen.add(`${Math.round(x * 1e4)},${Math.round(y * 1e4)}`);
      }
      expect(seen.size).toBe(n);
      // la ligne du pli (au milieu du contour déplié) porte des sommets, une fois chacun
      const xs = Array.from({ length: n }, (_, v) => pointAt(g, v)[0]);
      const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(xs.filter((x) => Math.abs(x - mid) < 1e-6).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('refuse une pièce sur pliure sans bord pli, ou à pli courbe, ou de quantité 2', () => {
    const noFold = { ...half(), edges: rectPanel(100, 200).edges, cutOnFold: true };
    expect(() => meshGarment(specOf([noFold]), 'draft')).toThrow(InvalidInputError);
    const curved = half();
    (curved.edges[3] as Edge).controls = [[-20, 100]];
    expect(() => meshGarment(specOf([curved]), 'draft')).toThrow(InvalidInputError);
    expect(() => meshGarment(specOf([{ ...half(), quantity: 2 }]), 'draft')).toThrow(
      InvalidInputError,
    );
  });

  it('cousue à une pièce de côté : les deux moitiés sont visées, le bord est dupliqué côté par côté', () => {
    // le bord droit (e1, x = 100) de la pièce dépliée existe à gauche et à droite
    const side = (id: string, s: 'left' | 'right'): Panel =>
      withPlacement(
        {
          ...polygonPanel(
            [
              [0, 0],
              [50, 0],
              [50, 200],
              [0, 200],
            ],
            id,
          ),
        },
        s,
        'back',
      );
    const seams: Seam[] = [
      { id: 'sl', a: { panelId: 'F', edgeId: 'e1' }, b: { panelId: 'L', edgeId: 'e3' } },
      { id: 'sr', a: { panelId: 'F', edgeId: 'e1' }, b: { panelId: 'R', edgeId: 'e3' } },
    ];
    const g = meshGarment(
      specOf([withPlacement(half(), 'center'), side('L', 'left'), side('R', 'right')], seams),
      'draft',
    );
    expect(g.seams.map((r) => [r.seamId, r.sideA, r.sideB])).toEqual([
      ['sl', 'left', 'left'],
      ['sr', 'right', 'right'],
    ]);
    // les deux couples visent des sommets de F différents (une moitié chacune)
    const fromF = (r: GarmentMesh['seams'][number]): number =>
      g.cloth.stitches[2 * r.stitchStart] as number;
    expect(fromF(g.seams[0] as never)).not.toBe(fromF(g.seams[1] as never));
    expect(g.vertexPiece[fromF(g.seams[0] as never)]).toBe(0);
  });
});
