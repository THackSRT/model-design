import type { Panel, Seam } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  DrapeTooLargeError,
  MAX_PANELS_PER_GARMENT,
  meshGarment,
  type GarmentMesh,
} from '../src/index.js';
import { InvalidInputError } from '../src/core/validate.js';
import { pointAt, specOf, totalArea, triArea, withPlacement } from './mesh-garment-helpers.js';
import { polygonPanel, rectPanel } from './mesh-helpers.js';

describe('quantity: 2', () => {
  // Trapèze asymétrique avec un droit fil en biais
  const trapeze = (): Panel => ({
    ...withPlacement(
      polygonPanel(
        [
          [0, 0],
          [100, 0],
          [60, 150],
          [0, 150],
        ],
        'S',
      ),
      'right',
      'outer',
    ),
    quantity: 2,
    grainline: [
      [0, 0],
      [10, 10],
    ],
  });

  it('ajoute une copie miroir aux triangles antihoraires et au droit fil symétrisé', () => {
    const g = meshGarment(specOf([trapeze()]), 'standard');
    expect(g.pieces.map((p) => [p.copy, p.side, p.mirrored])).toEqual([
      [0, 'right', false],
      [1, 'left', true],
    ]);
    const [p0, p1] = g.pieces as [GarmentMesh['pieces'][number], GarmentMesh['pieces'][number]];
    expect(p1.vertexCount).toBe(p0.vertexCount);
    expect(p1.triangleCount).toBe(p0.triangleCount);
    for (let t = 0; t < g.cloth.triangles.length / 3; t++) {
      expect(triArea(g, t)).toBeGreaterThan(0);
    }
    expect(totalArea(g, 1)).toBeCloseTo(totalArea(g, 0), 6);
    // positions : x s'inverse, y inchangé, sommet par sommet (modulo le décalage de pose)
    const [x0, y0] = pointAt(g, p0.vertexStart);
    const [x1, y1] = pointAt(g, p1.vertexStart);
    expect(y1).toBe(y0);
    const [xa, ya] = pointAt(g, p0.vertexStart + 5);
    const [xb, yb] = pointAt(g, p1.vertexStart + 5);
    expect(yb).toBe(ya);
    expect(xb - x1).toBeCloseTo(-(xa - x0), 9);
    const s = Math.SQRT1_2;
    const grain = g.cloth.grainUnit;
    for (let t = p0.triangleStart; t < p0.triangleStart + p0.triangleCount; t++) {
      expect(grain[2 * t]).toBeCloseTo(s, 12);
      expect(grain[2 * t + 1]).toBeCloseTo(s, 12);
    }
    for (let t = p1.triangleStart; t < p1.triangleStart + p1.triangleCount; t++) {
      expect(grain[2 * t]).toBeCloseTo(-s, 12);
      expect(grain[2 * t + 1]).toBeCloseTo(s, 12);
    }
  });

  it('relie une couture visant un côté à la bonne copie', () => {
    const body = (id: string, s: 'left' | 'right'): Panel =>
      withPlacement(rectPanel(60, 150), s, 'back');
    const named = (id: string, s: 'left' | 'right'): Panel => ({ ...body(id, s), id, name: id });
    const seams: Seam[] = [
      { id: 'toLeft', a: { panelId: 'S', edgeId: 'e0' }, b: { panelId: 'BL', edgeId: 'e0' } },
      { id: 'toRight', a: { panelId: 'S', edgeId: 'e0' }, b: { panelId: 'BR', edgeId: 'e0' } },
      // les deux bords ont deux copies : le côté de a force aussi celui de b
      {
        id: 'forced',
        a: { panelId: 'S', edgeId: 'e2', side: 'left' },
        b: { panelId: 'S', edgeId: 'e2', side: 'right' },
      },
    ];
    const g = meshGarment(
      specOf([trapeze(), named('BL', 'left'), named('BR', 'right')], seams),
      'draft',
    );
    const pieceOf = (v: number): GarmentMesh['pieces'][number] =>
      g.pieces[g.vertexPiece[v] as number] as GarmentMesh['pieces'][number];
    const first = (id: string): [number, number] => {
      const r = g.seams.find((x) => x.seamId === id) as GarmentMesh['seams'][number];
      return [
        g.cloth.stitches[2 * r.stitchStart] as number,
        g.cloth.stitches[2 * r.stitchStart + 1] as number,
      ];
    };
    const [l0] = first('toLeft');
    const [r0] = first('toRight');
    expect(pieceOf(l0)).toMatchObject({ panelId: 'S', copy: 1, side: 'left' });
    expect(pieceOf(r0)).toMatchObject({ panelId: 'S', copy: 0, side: 'right' });
    const [f0, f1] = first('forced');
    expect(pieceOf(f0)).toMatchObject({ copy: 1 });
    expect(pieceOf(f1)).toMatchObject({ copy: 0 });
  });

  it('refuse une quantité autre que 1 ou 2, une couture ambiguë ou un bord inconnu', () => {
    expect(() => meshGarment(specOf([{ ...rectPanel(50, 50), quantity: 3 }]), 'draft')).toThrow(
      InvalidInputError,
    );
    const two = trapeze();
    const ambiguous: Seam = {
      id: 'x',
      a: { panelId: 'S', edgeId: 'e0' },
      b: { panelId: 'S', edgeId: 'e2', side: 'left' },
    };
    // a a deux copies, b une seule du côté gauche : a prend sa copie gauche, aucune ambiguïté
    expect(meshGarment(specOf([two], [ambiguous]), 'draft').seams[0]?.sideA).toBe('left');
    const single = withPlacement(rectPanel(50, 50), 'center');
    const center: Seam = {
      id: 'c',
      a: { panelId: 'S', edgeId: 'e0' },
      b: { panelId: 'p', edgeId: 'e0' },
    };
    expect(() => meshGarment(specOf([two, single], [center]), 'draft')).toThrow(InvalidInputError);
    const unknown: Seam = {
      id: 'u',
      a: { panelId: 'S', edgeId: 'nope' },
      b: { panelId: 'p', edgeId: 'e0' },
    };
    expect(() => meshGarment(specOf([two, single], [unknown]), 'draft')).toThrow(InvalidInputError);
  });
});

describe('limites du vêtement', () => {
  it('refuse plus de pièces que la limite', () => {
    const panels = Array.from({ length: MAX_PANELS_PER_GARMENT + 1 }, (_, i) => ({
      ...rectPanel(30, 30),
      id: `p${i}`,
    }));
    expect(() => meshGarment(specOf(panels), 'draft')).toThrow(DrapeTooLargeError);
  });

  it('refuse plus de 30 000 sommets au total, même pièce par pièce sous la limite', () => {
    // 20 pièces de 1 200 × 1 200 mm en deux exemplaires : ~ 2 400 sommets chacune en qualité draft
    const panels = Array.from({ length: 20 }, (_, i) => ({
      ...rectPanel(1200, 1200),
      id: `p${i}`,
      quantity: 2,
    }));
    expect(() => meshGarment(specOf(panels), 'draft')).toThrow(DrapeTooLargeError);
    expect(() => meshGarment(specOf(panels.slice(0, 2)), 'draft')).not.toThrow();
  });
});
