import { Brian } from '@freesewing/brian';
import { describe, expect, it } from 'vitest';
import { sizeMeasurements } from '../src/adapters/freesewing/sizes.js';
import { MODELS } from '../src/adapters/freesewing/models.js';
import { draftModel, describeModel } from '../src/index.js';
import type { DraftOptions, DraftResult, PointMm, SizeName } from '../src/index.js';
import {
  BASE_OPTION_SETS,
  VALIDATION_SIZES,
  expectValidDraft,
  measurementSetOf,
  sexOf,
  sizeRequest,
} from './helpers.js';

const edgeLength = (result: DraftResult, partId: string, edgeId: string): number =>
  result.parts.find((part) => part.id === partId)?.edges.find((edge) => edge.id === edgeId)
    ?.lengthMm ?? Number.NaN;

/** Longueurs que FreeSewing range lui-même dans son magasin : d'emmanchure devant et dos, et de tête de manche. */
function freesewingLengths(size: SizeName, options: DraftOptions): Record<string, number> {
  const pattern = new Brian({
    measurements: sizeMeasurements(size),
    options,
    sa: 0,
    complete: false,
    paperless: false,
    units: 'metric',
  }).draft();
  const store = pattern.setStores[0];
  const read = (key: string): number => Number(store?.get(`library.sleeve.${key}`));
  return {
    front: read('frontArmholeLength'),
    back: read('backArmholeLength'),
    cap: read('sleevecapLength'),
  };
}

describe.each(VALIDATION_SIZES)('Brian, taille %s', (size) => {
  describe.each(BASE_OPTION_SETS.map((options, index) => [index, options] as const))(
    'options n° %i',
    (_index, options) => {
      it('trace sans erreur : bords résolus, contour couvert, sommets nommés', () => {
        const result = draftModel(sizeRequest(size, options));
        expectValidDraft(result);
        expect(result.parts.map((part) => part.edges.length)).toEqual([6, 6, 4]);
      });

      it('mesure les bords comme FreeSewing : emmanchures et tête de manche (0,001 mm)', () => {
        const result = draftModel(sizeRequest(size, options));
        const expected = freesewingLengths(size, options);
        expect(
          Math.abs(edgeLength(result, 'front', 'armhole') - (expected.front as number)),
        ).toBeLessThan(0.0006);
        expect(
          Math.abs(edgeLength(result, 'back', 'armhole') - (expected.back as number)),
        ).toBeLessThan(0.0006);
        expect(
          Math.abs(edgeLength(result, 'sleeve', 'sleeveCap') - (expected.cap as number)),
        ).toBeLessThan(0.0006);
      });
    },
  );

  it('rend le même tracé depuis le MeasurementSet équivalent à la taille', () => {
    const set = measurementSetOf(sexOf(size), sizeMeasurements(size));
    const fromSet = draftModel({ model: 'brian', measurements: { set } });
    expect(fromSet).toEqual(draftModel(sizeRequest(size)));
  });
});

describe('Brian : fiche aux bornes des options', () => {
  const { options } = describeModel('brian');

  it('reste valable à chaque bord de chaque option, sur les cinq tailles (0 erreur, contour couvert)', () => {
    let drafted = 0;
    for (const size of VALIDATION_SIZES) {
      for (const option of options) {
        const values =
          option.kind === 'number'
            ? [option.min, option.max]
            : option.kind === 'boolean'
              ? [true, false]
              : option.values;
        for (const value of values) {
          expectValidDraft(draftModel(sizeRequest(size, { [option.name]: value })), true);
          drafted++;
        }
      }
    }
    expect(drafted).toBeGreaterThan(350);
  });

  it('relaye l’avertissement de FreeSewing sans rejeter le tracé (épaule plus large que l’emmanchure)', () => {
    const result = draftModel(sizeRequest('cisFemaleAdult28', { chestEase: -0.04 }));
    expect(result.warnings).toEqual(['flag warn brian:largeShoulderWidth.t']);
    expectValidDraft(result, true);
  });

  it('suit la couture d’épaule quand s3Collar et s3Armhole la déplacent (points s3…Split)', () => {
    const shifted = draftModel(sizeRequest('cisMaleAdult42', { s3Collar: 1, s3Armhole: -1 }));
    expectValidDraft(shifted);
    const front = shifted.parts[0];
    const shoulder = front?.edges.find((edge) => edge.id === 'shoulder');
    expect(shoulder).toMatchObject({ fromPoint: 's3ArmholeSplit', toPoint: 's3CollarSplit' });
    const reference = draftModel(sizeRequest('cisMaleAdult42'));
    expect(shoulder?.lengthMm).not.toBe(edgeLength(reference, 'front', 'shoulder'));
  });
});

describe('Brian : les options et les mesures changent le tracé', () => {
  const reference = draftModel(sizeRequest('cisMaleAdult42'));

  it('allonge le devant avec lengthBonus et élargit le bas avec chestEase', () => {
    const longer = draftModel(sizeRequest('cisMaleAdult42', { lengthBonus: 0.4 }));
    expect(edgeLength(longer, 'front', 'centerFront')).toBeGreaterThan(
      edgeLength(reference, 'front', 'centerFront'),
    );
    const wider = draftModel(sizeRequest('cisMaleAdult42', { chestEase: 0.3 }));
    expect(edgeLength(wider, 'front', 'hem')).toBeGreaterThan(
      edgeLength(reference, 'front', 'hem'),
    );
  });

  it('prend la pointe de sein en compte avec draftForHighBust quand le tour de poitrine haute est connu', () => {
    const plain = draftModel(sizeRequest('cisFemaleAdult34'));
    const high = draftModel(sizeRequest('cisFemaleAdult34', { draftForHighBust: true }));
    expect(high.parts[0]?.edges).not.toEqual(plain.parts[0]?.edges);
  });

  it('suit la taille : le dos d’une taille 46 est plus long que celui d’une taille 28', () => {
    const small = draftModel(sizeRequest('cisFemaleAdult28'));
    const large = draftModel(sizeRequest('cisFemaleAdult46'));
    expect(edgeLength(large, 'back', 'centerBack')).toBeGreaterThan(
      edgeLength(small, 'back', 'centerBack'),
    );
    expect(edgeLength(large, 'sleeve', 'sleeveCap')).toBeGreaterThan(
      edgeLength(small, 'sleeve', 'sleeveCap'),
    );
  });
});

describe('Brian : fiche de couture', () => {
  it('donne à chaque bord un rôle sémantique de GarmentSpec et un identifiant unique dans sa pièce', () => {
    const roles = MODELS.brian.sheet.parts.map((part) =>
      part.edges.map((edge) => edge.semanticRole),
    );
    expect(roles).toEqual([
      ['centerFront', 'hem', 'side', 'armhole', 'shoulder', 'neckline'],
      ['centerBack', 'hem', 'side', 'armhole', 'shoulder', 'neckline'],
      ['underarm', 'sleeveHem', 'underarm', 'sleeveCap'],
    ]);
    for (const part of MODELS.brian.sheet.parts) {
      const ids = part.edges.map((edge) => edge.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('ne cite que des pièces que Brian trace, dans l’ordre de description du modèle', () => {
    const drawn = Object.keys(Brian.patternConfig.parts);
    const cited = MODELS.brian.sheet.parts.map((part) => part.part);
    for (const part of cited) expect(drawn).toContain(part);
    expect(describeModel('brian').parts).toEqual(cited);
  });
});

/** Point public d'une pièce tracée (0 devant, 1 dos, 2 manche) ; erreur si la pièce ne l'a pas. */
function pointOf(result: DraftResult, part: number, name: string): PointMm {
  const point = result.parts[part]?.points[name];
  if (point === undefined) throw new Error(`point ${name} absent de la pièce ${part}`);
  return point;
}

describe('Brian : repère des pièces (y vers le bas, origine en haut de la pièce de base)', () => {
  it.each(VALIDATION_SIZES)(
    'met le devant et le dos à x = 0 sur leur milieu et y = 0 au point d’encolure, taille %s',
    (size) => {
      const result = draftModel(sizeRequest(size));
      for (const [part, center] of [
        [0, 'cfNeck'],
        [1, 'cbNeck'],
      ] as const) {
        expect(pointOf(result, part, 'hps').yMm).toBe(0);
        expect(pointOf(result, part, center).xMm).toBe(0);
        expect(pointOf(result, part, 'hips').xMm).toBeGreaterThan(0);
      }
      expect(pointOf(result, 0, 'cfNeck').yMm).toBeGreaterThan(0);
    },
  );

  it.each(VALIDATION_SIZES)(
    'translate la manche de FreeSewing : le sommet de la tête est l’origine, le poignet pend à la longueur de bras, taille %s',
    (size) => {
      const result = draftModel(sizeRequest(size));
      expect(pointOf(result, 2, 'sleeveTop')).toEqual({ xMm: 0, yMm: 0 });
      expect(pointOf(result, 2, 'sleeveTip').yMm).toBe(0);
      expect(pointOf(result, 2, 'wristLeft').yMm).toBeCloseTo(
        sizeMeasurements(size).shoulderToWrist as number,
        3,
      );
      expect(pointOf(result, 2, 'bicepsLeft').xMm).toBeLessThan(0);
      expect(pointOf(result, 2, 'bicepsRight').xMm).toBeGreaterThan(0);
      expect(pointOf(result, 2, 'bicepsLeft').yMm).toBeGreaterThan(100);
    },
  );

  it('ne change que le repère : les longueurs de bords sont celles de FreeSewing (emmanchures, tête de manche)', () => {
    const result = draftModel(sizeRequest('cisMaleAdult42'));
    const expected = freesewingLengths('cisMaleAdult42', {});
    expect(
      Math.abs(edgeLength(result, 'sleeve', 'sleeveCap') - (expected.cap as number)),
    ).toBeLessThan(0.0006);
    expect(
      Math.abs(edgeLength(result, 'front', 'armhole') - (expected.front as number)),
    ).toBeLessThan(0.0006);
  });
});
