import type { GarmentSpec, Seam } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { sizeMeasurements } from '../src/adapters/freesewing/sizes.js';
import { draftModel, toGarmentSpec } from '../src/index.js';
import type { DraftOptions } from '../src/index.js';
import { BASE_OPTION_SETS, VALIDATION_SIZES, sizeRequest } from './helpers.js';
import {
  EXACT_MM,
  FIT_MM,
  TARGET_KEY,
  armholeSeams,
  distanceToPolyline,
  edgeOf,
  flatten,
  lengthOfEdge,
  schemaErrors,
  sidesOf,
  specOf,
  structureProblems,
  totalLength,
  tracedPolyline,
} from './spec-helpers.js';

describe.each(VALIDATION_SIZES)('GarmentSpec de Brian, taille %s', (size) => {
  describe.each(BASE_OPTION_SETS.map((options, index) => [index, options] as const))(
    'options n° %i',
    (_index, options) => {
      const draft = draftModel(sizeRequest(size, options));
      const spec = toGarmentSpec(draft);

      it('est valide contre le schéma 1.1 du contrat, contours fermés et trigonométriques', () => {
        expect(spec.specVersion).toBe('1.1');
        expect(schemaErrors(spec)).toEqual([]);
        expect(structureProblems(spec)).toEqual([]);
      });

      it('coud côté, épaule et dessous de bras à la même longueur, sans embu', () => {
        for (const id of ['side', 'shoulder', 'underarm']) {
          const seam = spec.seams.find((candidate) => candidate.id === id) as Seam;
          const [a, b] = sidesOf(spec, seam);
          expect(Math.abs(lengthOfEdge(a) - lengthOfEdge(b)), id).toBeLessThanOrEqual(EXACT_MM);
          expect(seam.easeMm).toBeUndefined();
        }
      });

      it('coud la tête de manche à la longueur que FreeSewing vise, à 2 mm près, sans embu déclaré', () => {
        const seams = armholeSeams(spec);
        const cap = seams.reduce((sum, seam) => sum + lengthOfEdge(sidesOf(spec, seam)[0]), 0);
        expect(Math.abs(cap - (draft.values[TARGET_KEY] as number))).toBeLessThanOrEqual(FIT_MM);
        // sleevecapEase vaut 0 : aucun embu n'est déclaré, l'écart n'est que l'ajustement de FreeSewing.
        expect(seams.map((seam) => seam.easeMm)).toEqual(seams.map(() => undefined));
      });
    },
  );

  it('pose le haut du devant, du dos et de la manche sur l’origine, la manche pendant de sa longueur', () => {
    const spec = specOf(size);
    for (const id of ['front', 'back']) {
      const shoulder = edgeOf(spec, id, 'shoulder');
      expect(shoulder.to[1]).toBe(0);
      expect(edgeOf(spec, id, id === 'front' ? 'centerFront' : 'centerBack').from[0]).toBe(0);
    }
    const hem = edgeOf(spec, 'sleeve', 'sleeveHem');
    expect(hem.from[1]).toBeCloseTo(-(sizeMeasurements(size).shoulderToWrist as number), 3);
    const cap =
      spec.panels
        .find((p) => p.id === 'sleeve')
        ?.edges.filter((e) => e.id.startsWith('sleeveCap')) ?? [];
    const top = Math.max(...cap.flatMap((edge) => flatten(edge, 400).map((point) => point[1])));
    expect(top).toBeCloseTo(0, 2);
    expect(edgeOf(spec, 'sleeve', 'underarmLeft').from[0]).toBeLessThan(0);
    expect(edgeOf(spec, 'sleeve', 'underarmRight').from[0]).toBeGreaterThan(0);
  });
});

describe('GarmentSpec de Brian : contenu', () => {
  const spec = specOf('cisMaleAdult42');
  const panel = (id: string) =>
    spec.panels.find((p) => p.id === id) as GarmentSpec['panels'][number];

  it('décrit une tunique de trois pièces : devant et dos au pli, manche en paire', () => {
    expect(spec).toMatchObject({
      unit: 'mm',
      garment: { type: 'tunic' },
      engine: { name: 'drafting' },
    });
    expect(spec.panels.map((p) => [p.id, p.name, p.quantity, p.cutOnFold])).toEqual([
      ['front', 'Devant', 1, true],
      ['back', 'Dos', 1, true],
      ['sleeve', 'Manche', 2, false],
    ]);
    expect(spec.estimatedMeasurements).toBeUndefined();
  });

  it('donne à chaque bord ses deux rôles : structurel (pli, ourlet, bord libre, couture) et sémantique', () => {
    const roles = (id: string) =>
      panel(id).edges.map((e) => [e.id.replace(/-\d+$/, ''), e.role, e.semanticRole]);
    const unique = (rows: unknown[][]) => [
      ...new Map(rows.map((row) => [row.join(), row])).values(),
    ];
    expect(unique(roles('front'))).toEqual([
      ['centerFront', 'fold', 'centerFront'],
      ['hem', 'hem', 'hem'],
      ['side', 'seam', 'side'],
      ['armhole', 'seam', 'armhole'],
      ['shoulder', 'seam', 'shoulder'],
      ['neckline', 'opening', 'neckline'],
    ]);
    expect(unique(roles('back'))[0]).toEqual(['centerBack', 'fold', 'centerBack']);
    expect(unique(roles('sleeve'))).toEqual([
      ['underarmLeft', 'seam', 'underarm'],
      ['sleeveHem', 'hem', 'sleeveHem'],
      ['underarmRight', 'seam', 'underarm'],
      ['sleeveCap', 'seam', 'sleeveCap'],
    ]);
  });

  it('coupe les bords courbes en sous-bords appariés : une droite ou une seule courbe par bord', () => {
    for (const p of spec.panels) {
      for (const edge of p.edges) expect([0, 2]).toContain(edge.controls?.length ?? 0);
    }
    expect(panel('front').edges.filter((e) => e.semanticRole === 'armhole').length).toBeGreaterThan(
      3,
    );
    expect(
      panel('sleeve').edges.filter((e) => e.semanticRole === 'sleeveCap').length,
    ).toBeGreaterThan(5);
    expect(spec.seams.map((s) => s.id).filter((id) => !id.startsWith('armhole'))).toEqual([
      'side',
      'shoulder',
      'underarm',
    ]);
    const front = panel('front').edges.filter((e) => e.semanticRole === 'armhole').length;
    const back = panel('back').edges.filter((e) => e.semanticRole === 'armhole').length;
    expect(armholeSeams(spec)).toHaveLength(front + back);
  });

  it('pose le devant et le dos par leur ourlet, la taille du patron à la taille du corps, et la manche à l’épaule', () => {
    const draft = draftModel(sizeRequest('cisMaleAdult42'));
    const heights = (index: number): { hem: number; waist: number } => {
      const points = draft.parts[index]?.points ?? {};
      const prefix = index === 0 ? 'cf' : 'cb';
      return {
        hem: points[`${prefix}Hem`]?.yMm ?? Number.NaN,
        waist: points[`${prefix}Waist`]?.yMm ?? Number.NaN,
      };
    };
    for (const [index, id, facing] of [
      [0, 'front', 'front'],
      [1, 'back', 'back'],
    ] as const) {
      const { hem, waist } = heights(index);
      // Le point d'ancrage est le coin d'ourlet sur l'axe ; son décalage, du repère « waist », est celui de l'ourlet sous la taille.
      expect(panel(id).placement).toEqual({
        zone: 'torso',
        bodySide: 'center',
        facing,
        anchor: { point: [0, -hem], landmark: 'waist', offsetMm: -(hem - waist) },
        clearanceMm: 30,
      });
    }
    expect(heights(0).hem).toBeGreaterThan(heights(0).waist);
    expect(panel('sleeve').placement).toEqual({
      zone: 'arm',
      bodySide: 'right',
      facing: 'outer',
      anchor: { point: [0, 0], landmark: 'shoulder', offsetMm: 0 },
      clearanceMm: 30,
    });
  });

  it('descend l’ancre avec l’ourlet quand lengthBonus allonge le bas, et reste dans les limites du contrat (± 500 mm)', () => {
    const offset = (options: DraftOptions, id: string): number =>
      specOf('cisMaleAdult42', options).panels.find((p) => p.id === id)?.placement?.anchor
        .offsetMm ?? Number.NaN;
    expect(offset({ lengthBonus: 0.28 }, 'front')).toBeLessThan(offset({}, 'front'));
    expect(offset({ lengthBonus: 0.28 }, 'front')).toBeCloseTo(-(641 * 1.28 - 502), 2);
    expect(offset({ lengthBonus: -0.04 }, 'back')).toBeGreaterThan(offset({}, 'back'));
    // Un bas à 60 % sous les hanches d'une grande taille sort de la plage : le décalage est borné, la spécification reste valide.
    const long = specOf('cisMaleAdult50', { lengthBonus: 0.6 });
    expect(long.panels[0]?.placement?.anchor.offsetMm).toBe(-500);
    expect(schemaErrors(long)).toEqual([]);
  });

  it('trace un droit fil vertical, parallèle au pli, à l’intérieur de la pièce', () => {
    for (const p of spec.panels) {
      const [low, high] = p.grainline as [number[], number[]];
      expect(low[0]).toBe(high[0]);
      expect(high[1]).toBeGreaterThan(low[1] as number);
    }
    const front = panel('front').grainline as [number[], number[]];
    expect(front[0]?.[0]).toBeGreaterThan(0);
  });

  it('garde la forme du tracé : chaque bord est sur le contour tracé, et chaque point du contour est sur un bord', () => {
    const draft = draftModel(sizeRequest('cisMaleAdult42'));
    for (const part of draft.parts) {
      const traced = tracedPolyline(part);
      const edges = panel(part.id).edges;
      const specPoints = edges.flatMap((edge) => flatten(edge, 400));
      for (const point of specPoints) expect(distanceToPolyline(point, traced)).toBeLessThan(0.01);
      for (const point of traced) expect(distanceToPolyline(point, specPoints)).toBeLessThan(0.01);
      const contourLength = part.contour.segments.reduce((sum, s) => sum + s.lengthMm, 0);
      expect(totalLength(edges)).toBeCloseTo(contourLength, 1);
    }
  });
});
