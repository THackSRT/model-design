import type { GarmentSpec } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { meshGarment, type GarmentMesh, type MeshQuality } from '../src/index.js';
import { validateCloth } from '../src/core/validate.js';
import bodiceWithSleeves from './fixtures/bodice-with-sleeves.json' with { type: 'json' };
import bodice from './fixtures/bodice.json' with { type: 'json' };
import circleSkirt from './fixtures/circle-skirt.json' with { type: 'json' };
import skirt from './fixtures/straight-skirt.json' with { type: 'json' };
import trousers from './fixtures/trousers.json' with { type: 'json' };
import { costRatio, sameBits } from './helpers.js';

// Fixtures : copies des références golden de engines/patterning/tests/golden (non modifiées).
const GARMENTS: ReadonlyArray<readonly [string, GarmentSpec]> = [
  ['jupe droite', skirt as unknown as GarmentSpec],
  ['jupe cercle', circleSkirt as unknown as GarmentSpec],
  ['pantalon', trousers as unknown as GarmentSpec],
  ['corsage', bodice as unknown as GarmentSpec],
  ['corsage avec manches', bodiceWithSleeves as unknown as GarmentSpec],
];
const QUALITIES: MeshQuality[] = ['draft', 'standard'];

/** Écart moyen de hauteur (y à plat) entre les deux sommets de chaque couple cousu, en mm. */
function meanHeightGap(g: GarmentMesh, from: number, count: number): number {
  const { stitches, flatMm } = g.cloth;
  let s = 0;
  for (let k = from; k < from + count; k++) {
    const a = stitches[2 * k] as number;
    const b = stitches[2 * k + 1] as number;
    s += Math.abs((flatMm[2 * a + 1] as number) - (flatMm[2 * b + 1] as number));
  }
  return s / count;
}

describe.each(GARMENTS)('%s', (_name, spec) => {
  describe.each(QUALITIES)('%s', (quality) => {
    const g = meshGarment(spec, quality);

    it('est un maillage valide, antihoraire, sans triangle dégénéré', () => {
      validateCloth(g.cloth);
      const { flatMm, triangles } = g.cloth;
      for (let t = 0; t < triangles.length; t += 3) {
        const [a, b, c] = [0, 1, 2].map((k) => (triangles[t + k] as number) * 2);
        const area =
          (((flatMm[b as number] as number) - (flatMm[a as number] as number)) *
            ((flatMm[(c as number) + 1] as number) - (flatMm[(a as number) + 1] as number)) -
            ((flatMm[(b as number) + 1] as number) - (flatMm[(a as number) + 1] as number)) *
              ((flatMm[c as number] as number) - (flatMm[a as number] as number))) /
          2;
        expect(area).toBeGreaterThan(0);
      }
      expect(g.cloth.pinned).toBeUndefined();
    });

    it('apparie toutes les coutures du contrat, sans écart de longueur', () => {
      for (const seam of spec.seams) {
        const reports = g.seams.filter((r) => r.seamId === seam.id);
        expect(reports.length, seam.id).toBeGreaterThan(0);
        for (const r of reports) {
          expect(r.stitchCount, seam.id).toBeGreaterThan(1);
          expect(r.mismatchMm, seam.id).toBeLessThan(1.5);
        }
      }
      const stitched = g.seams.reduce((n, r) => n + r.stitchCount, 0);
      expect(stitched).toBe(g.cloth.stitches.length / 2);
    });

    it('cache chaque sommet dans une pièce et chaque pièce dans une plage', () => {
      let covered = 0;
      for (const p of g.pieces) covered += p.vertexCount;
      expect(covered).toBe(g.cloth.flatMm.length / 2);
      expect(g.vertexPiece).toHaveLength(covered);
    });
  });
});

describe('hauteur des sommets cousus (coutures verticales : bon sens et bon appariement)', () => {
  it.each(
    [
      ['jupe droite', skirt],
      ['corsage', bodice],
      ['pantalon', trousers],
    ].map(([n, s]) => [n, s as unknown as GarmentSpec] as const),
  )('%s', (_n, spec) => {
    const g = meshGarment(spec, 'standard');
    for (const r of g.seams) {
      expect(meanHeightGap(g, r.stitchStart, r.stitchCount), r.seamId).toBeLessThan(25);
    }
  });
});

describe('déterminisme et performance', () => {
  it('mêmes entrées, mêmes bits', () => {
    for (const [, spec] of GARMENTS) {
      const a = meshGarment(spec, 'draft');
      const b = meshGarment(spec, 'draft');
      expect(sameBits(a.cloth.positionsMm, b.cloth.positionsMm)).toBe(true);
      expect(sameBits(a.cloth.grainUnit, b.cloth.grainUnit)).toBe(true);
      expect(Array.from(a.cloth.stitches)).toEqual(Array.from(b.cloth.stitches));
      expect(Array.from(a.cloth.triangles)).toEqual(Array.from(b.cloth.triangles));
    }
  });

  it('maille le vêtement le plus gros en qualité standard en moins de 2 s CPU', () => {
    for (const [, spec] of GARMENTS) meshGarment(spec, 'standard'); // chauffe du compilateur
    const sizes = GARMENTS.map(([name, spec]) => {
      let g: GarmentMesh | undefined;
      const ratio = costRatio(() => {
        g = meshGarment(spec, 'standard');
      });
      return { name, ratio, vertices: (g as GarmentMesh).cloth.flatMm.length / 2 };
    });
    const biggest = sizes.reduce((a, b) => (b.vertices > a.vertices ? b : a));
    expect(biggest.ratio, JSON.stringify(sizes)).toBeLessThan(0.6); // au repos : 0,05 à 0,30
  });
});
