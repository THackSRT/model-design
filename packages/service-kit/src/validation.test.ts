import { describe, expect, it } from 'vitest';
import { contractValidator } from './validation.js';

describe('contractValidator', () => {
  const validate = contractValidator<{ name: string }>('createDesignRequest');

  it('accepte une entrée conforme au contrat', () => {
    expect(validate({ name: 'Jupe', garmentType: 'straight-skirt' }).isOk()).toBe(true);
  });

  it('refuse une entrée non conforme et dit pourquoi', () => {
    const result = validate({ name: '', garmentType: 'robe', extra: 1 });
    expect(result.isErr() && result.error.status).toBe(400);
    expect(result.isErr() && result.error.errors?.length).toBeGreaterThanOrEqual(2);
  });

  it('suit les références entre schémas', () => {
    const version = contractValidator('createDesignVersionRequest');
    const input = {
      measurements: {
        sex: 'female',
        statureMm: 1650,
        chestGirthMm: 880,
        waistGirthMm: 700,
        hipGirthMm: 960,
      },
      garment: { type: 'straight-skirt', params: { lengthMm: 600 } },
    };
    expect(version(input).isOk()).toBe(true);
    expect(
      version({ ...input, measurements: { ...input.measurements, hipGirthMm: 5 } }).isErr(),
    ).toBe(true);
  });
});
