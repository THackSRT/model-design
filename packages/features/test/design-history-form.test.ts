import type { DesignVersion } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { initialForm, type StudioForm, toVersionRequest } from '../src/pattern-studio/form.js';
import { versionToForm } from '../src/design-history/version-to-form.js';

function requestOf(form: StudioForm): Pick<DesignVersion, 'measurements' | 'garment'> {
  const request = toVersionRequest(form);
  if (request.isErr()) throw new Error('formulaire invalide');
  return request.value;
}

describe('versionToForm', () => {
  it.each(['straight-skirt', 'circle-skirt', 'trousers', 'bodice'] as const)(
    'aller-retour avec le formulaire : %s',
    (garmentType) => {
      const form: StudioForm = { ...initialForm, garmentType, sex: 'male' };
      const version = requestOf(form);
      const back = versionToForm(version);
      expect(toVersionRequest(back).isOk()).toBe(true);
      expect(requestOf(back)).toEqual(version);
    },
  );

  it('aller-retour d’un corsage avec manches', () => {
    const form: StudioForm = { ...initialForm, garmentType: 'bodice', withSleeve: true };
    const version = requestOf(form);
    const back = versionToForm(version);
    expect(back.withSleeve).toBe(true);
    expect(requestOf(back)).toEqual(version);
  });

  it('convertit mm en cm sans dérive de flottant', () => {
    const form: StudioForm = {
      ...initialForm,
      measurementsCm: { ...initialForm.measurementsCm, waistGirthMm: 71.3 },
      paramsByType: { ...initialForm.paramsByType, 'straight-skirt': { lengthMm: 63.5 } },
    };
    const back = versionToForm(requestOf(form));
    expect(back.measurementsCm.waistGirthMm).toBeCloseTo(71.3, 10);
    expect(back.paramsByType['straight-skirt']).toEqual({ lengthMm: 63.5 });
  });

  it('champs facultatifs absents : restent absents, sans défaut', () => {
    const form: StudioForm = {
      ...initialForm,
      paramsByType: { ...initialForm.paramsByType, 'straight-skirt': { lengthMm: 60 } },
    };
    const version = requestOf(form);
    expect(version.garment.params).toEqual({ lengthMm: 600 });
    const back = versionToForm(version);
    expect(back.paramsByType['straight-skirt']).toEqual({ lengthMm: 60 });
    expect(back.measurementsCm.bustGirthMm).toBeUndefined();
    expect(back.withSleeve).toBe(false);
    expect(requestOf(back)).toEqual(version);
  });

  it('garde la saisie des autres types et celle des manches décochées', () => {
    const base: StudioForm = {
      ...initialForm,
      paramsByType: { ...initialForm.paramsByType, trousers: { lengthMm: 111 } },
      sleeveCm: { lengthMm: 44 },
    };
    const back = versionToForm(requestOf(initialForm), base);
    expect(back.paramsByType.trousers).toEqual({ lengthMm: 111 });
    expect(back.sleeveCm).toEqual({ lengthMm: 44 });
  });
});
