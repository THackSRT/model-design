import type { DesignVersion } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { versionToForm } from '../src/design-history/version-to-form.js';
import { defaultLengthMm } from '../src/pattern-studio/garment-defaults.js';
import { initialForm, type StudioForm, toVersionRequest } from '../src/pattern-studio/form.js';
import {
  type FinishedKey,
  finishedFields,
  syncFinished,
  withFinished,
  withMeasurement,
  withParam,
  withRecalculated,
  withSleeveParam,
} from '../src/pattern-studio/garment-measures.js';

// Corps fictif : stature 165 cm, taille 70, hanches 96, poitrine 92 (cf. initialForm).
const as = (type: StudioForm['garmentType'], form: StudioForm = initialForm): StudioForm => ({
  ...form,
  garmentType: type,
});
const field = (form: StudioForm, key: FinishedKey) =>
  finishedFields(form, {}).find((f) => f.key === key);

describe('mesures finies proposées par défaut', () => {
  it('jupe droite : taille et hanches = corps + aisance du contrat, longueur au genou', () => {
    const form = as('straight-skirt');
    expect(finishedFields(form, {})).toEqual([
      { key: 'waistGirthMm', valueCm: 71, source: 'auto' },
      { key: 'hipGirthMm', valueCm: 100, source: 'auto' },
      { key: 'lengthMm', valueCm: 55.3, source: 'auto' },
    ]);
  });

  it('jupe cercle : taille et longueur au genou', () => {
    expect(finishedFields(as('circle-skirt'), {})).toEqual([
      { key: 'waistGirthMm', valueCm: 71, source: 'auto' },
      { key: 'lengthMm', valueCm: 55.3, source: 'auto' },
    ]);
  });

  it('pantalon : longueur à la cheville', () => {
    expect(finishedFields(as('trousers'), {})).toEqual([
      { key: 'waistGirthMm', valueCm: 71, source: 'auto' },
      { key: 'hipGirthMm', valueCm: 101, source: 'auto' },
      { key: 'lengthMm', valueCm: 95.9, source: 'auto' },
    ]);
  });

  it('corsage sans manches : poitrine et taille ; avec manches : longueur de bras estimée', () => {
    const bodice = as('bodice');
    expect(finishedFields(bodice, {}).map((f) => [f.key, f.valueCm])).toEqual([
      ['bustGirthMm', 98],
      ['waistGirthMm', 74],
    ]);
    const sleeved = finishedFields({ ...bodice, withSleeve: true }, {});
    expect(sleeved.at(-1)).toEqual({ key: 'sleeveLengthMm', valueCm: 54.5, source: 'auto' });
  });

  it('la longueur de manche est armLengthMm quand elle est mesurée', () => {
    const form = withMeasurement(as('bodice'), 'armLengthMm', 61);
    expect(field({ ...form, withSleeve: true }, 'sleeveLengthMm')?.valueCm).toBe(61);
    expect(form.sleeveCm.lengthMm).toBe(61);
  });

  it('estimation sans waistHeightMm (rapports de la stature), puis avec', () => {
    expect(defaultLengthMm('skirt', { statureMm: 1650 })).toBe(553);
    expect(defaultLengthMm('skirt', { statureMm: 1650, waistHeightMm: 1100 })).toBe(630);
    expect(defaultLengthMm('trousers', {})).toBeUndefined();
    const form = withMeasurement(initialForm, 'waistHeightMm', 110);
    expect(form.paramsByType['straight-skirt']?.lengthMm).toBe(63);
  });

  it('la saisie envoyée suit : aisances du contrat, longueur estimée', () => {
    const request = toVersionRequest(initialForm);
    expect(request.isOk() && request.value.garment.params).toMatchObject({
      lengthMm: 553,
      waistEaseMm: 10,
      hipEaseMm: 40,
    });
  });

  it('valeurs bornées aux limites du contrat', () => {
    let form = withMeasurement(initialForm, 'statureMm', 200);
    form = withMeasurement(form, 'waistHeightMm', 50);
    expect(form.paramsByType['straight-skirt']?.lengthMm).toBe(30);
    form = withMeasurement(as('trousers', form), 'waistHeightMm', 140);
    form = withMeasurement(form, 'statureMm', 100);
    expect(form.paramsByType.trousers?.lengthMm).toBe(130);
  });
});

describe('saisie d’une mesure finie', () => {
  it('aller-retour mesure finie / aisance', () => {
    const form = withFinished(initialForm, 'waistGirthMm', 75.5);
    expect(form.paramsByType['straight-skirt']?.waistEaseMm).toBe(5.5);
    expect(field(form, 'waistGirthMm')).toEqual({
      key: 'waistGirthMm',
      valueCm: 75.5,
      source: 'manual',
    });
    const request = toVersionRequest(form);
    expect(request.isOk() && request.value.garment.params).toMatchObject({ waistEaseMm: 55 });
    // et dans l'autre sens : saisir l'aisance donne la mesure finie
    const back = withParam(initialForm, 'hipEaseMm', 6);
    expect(field(back, 'hipGirthMm')).toMatchObject({ valueCm: 102, source: 'manual' });
  });

  it('un champ modifié n’est pas écrasé par un changement de mesure du corps', () => {
    let form = withFinished(initialForm, 'hipGirthMm', 105);
    form = withMeasurement(form, 'hipGirthMm', 98);
    form = withMeasurement(form, 'statureMm', 180);
    expect(field(form, 'hipGirthMm')).toMatchObject({ valueCm: 105, source: 'manual' });
    expect(form.paramsByType['straight-skirt']?.hipEaseMm).toBe(7);
    // les champs auto suivent le corps
    expect(field(form, 'waistGirthMm')).toMatchObject({ valueCm: 71, source: 'auto' });
    expect(field(form, 'lengthMm')?.valueCm).toBe(60.3);
  });

  it('changer de type recalcule les champs auto seulement', () => {
    const edited = withFinished(as('trousers'), 'lengthMm', 90);
    const changed = withMeasurement(as('circle-skirt', edited), 'statureMm', 180);
    expect(field(changed, 'lengthMm')?.valueCm).toBe(60.3);
    expect(field(as('trousers', changed), 'lengthMm')).toMatchObject({
      valueCm: 90,
      source: 'manual',
    });
  });

  it('saisir une longueur ou une manche tel quel rend le champ manual', () => {
    expect(field(withParam(initialForm, 'lengthMm', 70), 'lengthMm')).toMatchObject({
      valueCm: 70,
      source: 'manual',
    });
    const bodice = { ...as('bodice'), withSleeve: true };
    expect(field(withSleeveParam(bodice, 'lengthMm', 50), 'sleeveLengthMm')).toMatchObject({
      valueCm: 50,
      source: 'manual',
    });
  });

  it('« recalculer » remet un champ, puis tous, en auto', () => {
    let form = withFinished(initialForm, 'waistGirthMm', 80);
    form = withFinished(form, 'lengthMm', 70);
    const one = withRecalculated(form, 'lengthMm');
    expect(field(one, 'lengthMm')).toMatchObject({ valueCm: 55.3, source: 'auto' });
    expect(field(one, 'waistGirthMm')).toMatchObject({ valueCm: 80, source: 'manual' });
    const all = withRecalculated(form);
    expect(finishedFields(all, {}).every((f) => f.source === 'auto')).toBe(true);
    expect(all.paramsByType['straight-skirt']).toMatchObject({ waistEaseMm: 1, lengthMm: 55.3 });
  });
});

describe('version rechargée et erreurs', () => {
  it('tous les champs sont manual : une mesure du corps ne les change pas', () => {
    const request = toVersionRequest(initialForm);
    if (request.isErr()) throw new Error('formulaire invalide');
    const version = request.value as Pick<DesignVersion, 'measurements' | 'garment'>;
    const form = versionToForm(version);
    expect(finishedFields(form, {}).every((f) => f.source === 'manual')).toBe(true);
    expect(finishedFields(form, {}).map((f) => f.valueCm)).toEqual([71, 100, 55.3]);
    const moved = withMeasurement(form, 'statureMm', 190);
    expect(moved.paramsByType['straight-skirt']?.lengthMm).toBe(55.3);
    expect(syncFinished(form)).toEqual(form);
  });

  it('mesure finie sous corps + aisance minimale : erreur du champ, pas de requête', () => {
    const form = withFinished(as('trousers'), 'hipGirthMm', 96.5); // aisance 5 mm < 20 mm
    const request = toVersionRequest(form);
    expect(request.isErr() && request.error).toEqual({
      'finished.hipGirthMm': { code: 'easeRange', minMm: 20, maxMm: 200 },
    });
    const errors = request.isErr() ? request.error : {};
    expect(finishedFields(form, errors).find((f) => f.key === 'hipGirthMm')?.error).toEqual({
      code: 'easeRange',
      minMm: 20,
      maxMm: 200,
    });
  });

  it('mesure finie trop ample : même erreur, bornes d’aisance du contrat', () => {
    const request = toVersionRequest(withFinished(initialForm, 'waistGirthMm', 120));
    expect(request.isErr() && request.error['finished.waistGirthMm']).toEqual({
      code: 'easeRange',
      minMm: 0,
      maxMm: 80,
    });
  });

  it('longueur hors bornes : erreur sous la clé de la longueur', () => {
    const request = toVersionRequest(withFinished(initialForm, 'lengthMm', 10));
    expect(request.isErr() && request.error.lengthMm).toMatchObject({ code: 'range' });
  });
});
