import { describe, expect, it } from 'vitest';
import { initialForm, toVersionRequest } from '../src/pattern-studio/form.js';

describe('saisie de l’atelier', () => {
  it('convertit les centimètres saisis en millimètres entiers du contrat', () => {
    const request = toVersionRequest({
      ...initialForm,
      measurementsCm: { ...initialForm.measurementsCm, waistGirthMm: 70.4 },
    });
    expect(request.isOk() && request.value.measurements.waistGirthMm).toBe(704);
    const garment = request.isOk() ? request.value.garment : undefined;
    expect(garment?.type).toBe('straight-skirt');
    expect(garment?.type === 'straight-skirt' && garment.params.lengthMm).toBe(600);
  });

  it('applique les bornes du contrat et dit lesquelles', () => {
    const request = toVersionRequest({
      ...initialForm,
      measurementsCm: { ...initialForm.measurementsCm, hipGirthMm: 20, statureMm: undefined },
    });
    expect(request.isErr() && request.error).toEqual({
      hipGirthMm: { code: 'range', minMm: 600, maxMm: 1900 },
      statureMm: { code: 'required' },
    });
  });
});
