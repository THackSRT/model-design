import { describe, expect, it } from 'vitest';
import { InvalidOptionError, describeModel, draftModel } from '../src/index.js';
import type { OptionSpec } from '../src/index.js';
import { validateOptions } from '../src/core/options.js';
import { sizeRequest } from './helpers.js';

const SPECS: OptionSpec[] = [
  { name: 'ease', kind: 'number', min: -0.04, max: 0.35, integer: false },
  { name: 'pleats', kind: 'number', min: 1, max: 12, integer: true },
  { name: 'wide', kind: 'boolean' },
  { name: 'style', kind: 'choice', values: ['round', 'v'] },
];

const reasonOf = (options: Record<string, unknown>): string => {
  try {
    validateOptions('demo', SPECS, options as never);
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidOptionError);
    return (error as InvalidOptionError).reason;
  }
  return 'accepted';
};

describe('validateOptions', () => {
  it('accepte des valeurs dans leurs bornes, bornes comprises', () => {
    expect(reasonOf({ ease: -0.04, pleats: 12, wide: false, style: 'v' })).toBe('accepted');
    expect(reasonOf({ ease: 0.35, pleats: 1, wide: true, style: 'round' })).toBe('accepted');
    expect(reasonOf({})).toBe('accepted');
  });

  it('refuse une option inconnue, sans toucher aux options héritées de Object', () => {
    expect(reasonOf({ nonsense: 1 })).toBe('is not an adjustable option of this model');
    expect(reasonOf({ constructor: 1 })).toBe('is not an adjustable option of this model');
    expect(reasonOf(JSON.parse('{"__proto__": 1}'))).toBe(
      'is not an adjustable option of this model',
    );
  });

  it('refuse un nombre hors bornes, en donnant les bornes', () => {
    expect(reasonOf({ ease: 0.36 })).toBe('must be between -0.04 and 0.35');
    expect(reasonOf({ ease: -0.05 })).toBe('must be between -0.04 and 0.35');
    expect(reasonOf({ pleats: 13 })).toBe('must be between 1 and 12');
  });

  it('refuse un nombre qui n’en est pas un, ou un entier attendu', () => {
    expect(reasonOf({ ease: Number.NaN })).toBe('must be a finite number');
    expect(reasonOf({ ease: Number.POSITIVE_INFINITY })).toBe('must be a finite number');
    expect(reasonOf({ ease: '0.1' })).toBe('must be a finite number');
    expect(reasonOf({ ease: true })).toBe('must be a finite number');
    expect(reasonOf({ pleats: 2.5 })).toBe('must be an integer');
  });

  it('refuse un booléen ou un choix du mauvais type ou hors liste', () => {
    expect(reasonOf({ wide: 1 })).toBe('must be a boolean');
    expect(reasonOf({ wide: 'true' })).toBe('must be a boolean');
    expect(reasonOf({ style: 'square' })).toBe('must be one of round, v');
    expect(reasonOf({ style: 3 })).toBe('must be one of round, v');
  });

  it('nomme le modèle et l’option dans l’erreur', () => {
    try {
      validateOptions('demo', SPECS, { ease: 9 });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid-option', model: 'demo', option: 'ease' });
      expect((error as Error).message).toBe(
        'model demo, option "ease": must be between -0.04 and 0.35',
      );
    }
  });
});

describe('options de Brian', () => {
  const brian = describeModel('brian');
  const spec = (name: string): OptionSpec | undefined => brian.options.find((o) => o.name === name);

  it('lit les options réglables dans la configuration de FreeSewing : pourcentages en fractions', () => {
    expect(spec('chestEase')).toEqual({
      name: 'chestEase',
      kind: 'number',
      min: -0.04,
      max: 0.35,
      integer: false,
    });
    expect(spec('lengthBonus')).toMatchObject({ kind: 'number', min: -0.04, max: 0.6 });
    expect(spec('cuffEase')).toMatchObject({ kind: 'number', min: 0, max: 2 });
    expect(spec('draftForHighBust')).toEqual({ name: 'draftForHighBust', kind: 'boolean' });
  });

  it('ne propose pas les valeurs fixes du modèle', () => {
    for (const fixed of [
      'collarFactor',
      'libraryFitSleeve',
      'brianFitCollar',
      'optionPrefix',
      'mockSleeve',
    ]) {
      expect(spec(fixed)).toBeUndefined();
    }
  });

  it('accepte chaque option à ses deux bornes et refuse un pas au-delà', () => {
    const numbers = brian.options.filter((o) => o.kind === 'number');
    expect(numbers.length).toBeGreaterThan(30);
    for (const option of numbers) {
      if (option.kind !== 'number') continue;
      expect(() =>
        validateOptions('brian', brian.options, { [option.name]: option.min }),
      ).not.toThrow();
      expect(() =>
        validateOptions('brian', brian.options, { [option.name]: option.max }),
      ).not.toThrow();
      expect(() =>
        validateOptions('brian', brian.options, { [option.name]: option.max + 0.001 }),
      ).toThrow(InvalidOptionError);
      expect(() =>
        validateOptions('brian', brian.options, { [option.name]: option.min - 0.001 }),
      ).toThrow(InvalidOptionError);
    }
  });

  it('refuse une option invalide avant tout tracé', () => {
    for (const options of [
      { nonsense: 1 },
      { chestEase: 9 },
      { chestEase: '0.1' },
      { draftForHighBust: 1 },
    ]) {
      const attempt = (): unknown => draftModel(sizeRequest('cisMaleAdult42', options as never));
      expect(attempt).toThrow(InvalidOptionError);
    }
  });
});
