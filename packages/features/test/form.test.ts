import type { CreateDesignVersionRequest } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { initialForm, type StudioForm, toVersionRequest } from '../src/pattern-studio/form.js';

const withParams = (form: StudioForm, params: Record<string, number | undefined>): StudioForm => ({
  ...form,
  paramsByType: {
    ...form.paramsByType,
    [form.garmentType]: { ...form.paramsByType[form.garmentType], ...params },
  },
});

const measurements = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 700,
  hipGirthMm: 960,
} as const;

describe('saisie de l’atelier', () => {
  it('convertit les centimètres saisis en millimètres entiers du contrat', () => {
    const request = toVersionRequest({
      ...initialForm,
      measurementsCm: { ...initialForm.measurementsCm, waistGirthMm: 70.4 },
    });
    expect(request.isOk() && request.value.measurements.waistGirthMm).toBe(704);
  });

  it('jupe droite : requête complète', () => {
    const expected: CreateDesignVersionRequest = {
      measurements,
      garment: {
        type: 'straight-skirt',
        params: { lengthMm: 600, waistEaseMm: 10, hipEaseMm: 40, hemFlareMm: 0 },
      },
    };
    const request = toVersionRequest(initialForm);
    expect(request.isOk() && request.value).toEqual(expected);
  });

  it('jupe cercle : fraction sans unité et ceinture à 0', () => {
    const form = withParams(
      { ...initialForm, garmentType: 'circle-skirt' },
      { circleFraction: 0.5, waistbandWidthMm: 0 },
    );
    const expected: CreateDesignVersionRequest = {
      measurements,
      garment: {
        type: 'circle-skirt',
        params: { lengthMm: 600, waistEaseMm: 10, circleFraction: 0.5, waistbandWidthMm: 0 },
      },
    };
    const request = toVersionRequest(form);
    expect(request.isOk() && request.value).toEqual(expected);
  });

  it('pantalon : entrejambe envoyé, bas de jambe vide omis', () => {
    const request = toVersionRequest({ ...initialForm, garmentType: 'trousers' });
    const expected: CreateDesignVersionRequest = {
      measurements: { ...measurements, crotchHeightMm: 780 },
      garment: {
        type: 'trousers',
        params: { lengthMm: 1000, waistEaseMm: 10, hipEaseMm: 50 },
      },
    };
    expect(request.isOk() && request.value).toEqual(expected);
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

  it('longueur hors bornes : range ; champ requis vide : required', () => {
    const request = toVersionRequest(withParams(initialForm, { lengthMm: 10 }));
    expect(request.isErr() && request.error.lengthMm).toEqual({
      code: 'range',
      minMm: 300,
      maxMm: 1300,
    });
    const empty = toVersionRequest(withParams(initialForm, { lengthMm: undefined }));
    expect(empty.isErr() && empty.error.lengthMm).toEqual({ code: 'required' });
  });

  it('ceinture : 1 cm n’est ni 0 ni dans 20 à 80 mm', () => {
    const form = withParams(
      { ...initialForm, garmentType: 'circle-skirt' },
      { waistbandWidthMm: 1 },
    );
    const request = toVersionRequest(form);
    expect(request.isErr() && request.error.waistbandWidthMm).toEqual({
      code: 'zeroOrRange',
      minMm: 20,
      maxMm: 80,
    });
    expect(toVersionRequest(withParams(form, { waistbandWidthMm: 4 })).isOk()).toBe(true);
  });

  it('fraction de cercle hors bornes : ratioRange', () => {
    const form = withParams({ ...initialForm, garmentType: 'circle-skirt' }, { circleFraction: 2 });
    const request = toVersionRequest(form);
    expect(request.isErr() && request.error.circleFraction).toEqual({
      code: 'ratioRange',
      min: 0.25,
      max: 1,
    });
  });

  it('pantalon sans hauteur d’entrejambe : required', () => {
    const request = toVersionRequest({
      ...initialForm,
      garmentType: 'trousers',
      measurementsCm: { ...initialForm.measurementsCm, crotchHeightMm: undefined },
    });
    expect(request.isErr() && request.error).toEqual({ crotchHeightMm: { code: 'required' } });
  });

  it('un type non tracé n’est pas demandé', () => {
    const request = toVersionRequest({ ...initialForm, garmentType: 'bodice' });
    expect(request.isErr() && request.error).toEqual({ garmentType: { code: 'unavailable' } });
  });
});
