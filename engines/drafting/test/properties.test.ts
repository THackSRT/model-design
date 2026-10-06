import { describe, expect, it } from 'vitest';
import { sizeMeasurements } from '../src/adapters/freesewing/sizes.js';
import {
  FreeSewingError,
  HPS_ABOVE_CERVICALE_RATIO,
  describeModel,
  draftModel,
} from '../src/index.js';
import type { DraftResult, OptionSpec } from '../src/index.js';
import {
  VALIDATION_SIZES,
  expectValidDraft,
  measurementSetOf,
  mulberry32,
  sexOf,
  type FsMeasures,
} from './helpers.js';

const edgeLength = (result: DraftResult, partId: string, edgeId: string): number =>
  result.parts.find((part) => part.id === partId)?.edges.find((edge) => edge.id === edgeId)
    ?.lengthMm ?? Number.NaN;

/** Une valeur tirée au hasard dans les bornes d'une option. */
function randomValue(spec: OptionSpec, random: () => number): number | boolean | string {
  if (spec.kind === 'boolean') return random() < 0.5;
  if (spec.kind === 'choice')
    return spec.values[Math.floor(random() * spec.values.length)] as string;
  const value = spec.min + random() * (spec.max - spec.min);
  return spec.integer ? Math.round(value) : value;
}

describe('propriétés : options tirées au hasard dans leurs bornes', () => {
  const { options: specs } = describeModel('brian');

  it('donne un tracé valide, ou la rejette par une erreur de FreeSewing (moins de 2 % des cas)', () => {
    const random = mulberry32(99);
    let rejected = 0;
    const runs = 300;
    for (let i = 0; i < runs; i++) {
      const options: Record<string, number | boolean | string> = {};
      for (const spec of specs) if (random() < 0.5) options[spec.name] = randomValue(spec, random);
      const size = VALIDATION_SIZES[
        i % VALIDATION_SIZES.length
      ] as (typeof VALIDATION_SIZES)[number];
      try {
        expectValidDraft(draftModel({ model: 'brian', measurements: { size }, options }), true);
      } catch (error) {
        // Seule exception admise : FreeSewing journalise une erreur (défaut de sa bibliothèque, ADR 0019, L5). Jamais un
        // bord introuvable ni un contour mal couvert : ce serait la fiche en défaut.
        if (!(error instanceof FreeSewingError)) throw error;
        rejected++;
      }
    }
    expect(rejected).toBeLessThanOrEqual(runs * 0.02);
  });

  it('couvre les fenêtres étroites où FreeSewing fusionne des points voisins (lengthBonus presque nul)', () => {
    for (const lengthBonus of [
      -0.0009, -0.0004, -0.0001, 0, 0.0001, 0.0004, 0.0007, 0.0009, 0.0012,
    ]) {
      for (const size of VALIDATION_SIZES) {
        const result = draftModel({
          model: 'brian',
          measurements: { size },
          options: { lengthBonus },
        });
        expectValidDraft(result);
      }
    }
  });

  it('rend le même tracé deux fois', () => {
    const random = mulberry32(5);
    for (let i = 0; i < 25; i++) {
      const options: Record<string, number | boolean | string> = {};
      for (const spec of specs) if (random() < 0.3) options[spec.name] = randomValue(spec, random);
      const request = {
        model: 'brian',
        measurements: { size: 'cisFemaleAdult34' },
        options,
      } as const;
      try {
        expect(JSON.stringify(draftModel(request))).toBe(JSON.stringify(draftModel(request)));
      } catch (error) {
        if (!(error instanceof FreeSewingError)) throw error;
      }
    }
  });
});

describe('propriétés : mesures plausibles tirées au hasard', () => {
  /** Mesures d'une taille, chacune de celles que Brian exige décalée au hasard de ± 8 %, en mm entiers. */
  function randomMeasures(
    size: (typeof VALIDATION_SIZES)[number],
    random: () => number,
  ): FsMeasures {
    const measures: Record<string, number> = { ...sizeMeasurements(size) };
    for (const name of describeModel('brian').measurements) {
      const base = measures[name] as number;
      measures[name] = Math.max(1, Math.round(base * (0.92 + random() * 0.16)));
    }
    return measures;
  }

  it('donne un tracé valide, et les longueurs que les formules de Brian prédisent', () => {
    const random = mulberry32(2026);
    for (let i = 0; i < 120; i++) {
      const size = VALIDATION_SIZES[
        i % VALIDATION_SIZES.length
      ] as (typeof VALIDATION_SIZES)[number];
      const fs = randomMeasures(size, random);
      const chestEase = random() * 0.3;
      const cuffEase = random() * 1.5;
      const lengthBonus = random() * 0.5;
      const set = measurementSetOf(sexOf(size), fs);
      const result = draftModel({
        model: 'brian',
        measurements: { set },
        options: { chestEase, cuffEase, lengthBonus },
      });
      expectValidDraft(result, true);
      const at = (name: string): number => fs[name] as number;
      // Le bas du devant et du dos : un quart du tour de poitrine, aisance comprise.
      const quarterChest = (at('chest') * (1 + chestEase)) / 4;
      expect(edgeLength(result, 'front', 'hem')).toBeCloseTo(quarterChest, 2);
      expect(edgeLength(result, 'back', 'hem')).toBeCloseTo(quarterChest, 2);
      // Le bas de manche : le tour de poignet, aisance comprise.
      expect(edgeLength(result, 'sleeve', 'sleeveHem')).toBeCloseTo(
        at('wrist') * (1 + cuffEase),
        2,
      );
      // Le milieu dos va de la cervicale (5 % du tour de cou sous le HPS) au bas, allongé par lengthBonus.
      const neckDrop = HPS_ABOVE_CERVICALE_RATIO * at('neck');
      const hips = set.backWaistLengthMm as number;
      const hipsY = hips + neckDrop + at('waistToHips');
      expect(edgeLength(result, 'back', 'centerBack')).toBeCloseTo(
        hipsY * (1 + lengthBonus) - neckDrop,
        2,
      );
    }
  });

  it('allonge le milieu devant et le milieu dos quand lengthBonus augmente', () => {
    const random = mulberry32(8);
    for (let i = 0; i < 40; i++) {
      const size = VALIDATION_SIZES[
        i % VALIDATION_SIZES.length
      ] as (typeof VALIDATION_SIZES)[number];
      const short = random() * 0.25;
      const long = short + 0.01 + random() * 0.2;
      const lengths = [short, long].map((lengthBonus) =>
        draftModel({ model: 'brian', measurements: { size }, options: { lengthBonus } }),
      );
      for (const [part, edge] of [
        ['front', 'centerFront'],
        ['back', 'centerBack'],
      ] as const) {
        const [a, b] = lengths.map((result) => edgeLength(result as DraftResult, part, edge));
        expect(b).toBeGreaterThan(a as number);
      }
    }
  });

  it('élargit le bas du devant d’un quart de l’écart de tour de poitrine (sans aisance)', () => {
    const random = mulberry32(3);
    for (let i = 0; i < 30; i++) {
      const size = VALIDATION_SIZES[
        i % VALIDATION_SIZES.length
      ] as (typeof VALIDATION_SIZES)[number];
      const fs = randomMeasures(size, random);
      const bigger = { ...fs, chest: (fs.chest as number) + 20 };
      const hems = [fs, bigger].map((measures) =>
        edgeLength(
          draftModel({
            model: 'brian',
            measurements: { set: measurementSetOf(sexOf(size), measures) },
            options: { chestEase: 0 },
          }),
          'front',
          'hem',
        ),
      );
      expect((hems[1] as number) - (hems[0] as number)).toBeCloseTo(5, 2);
    }
  });
});
