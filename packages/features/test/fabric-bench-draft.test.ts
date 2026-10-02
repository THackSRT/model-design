import { describe, expect, it } from 'vitest';
import {
  FABRIC_BOUNDS,
  roundToThreeDigits,
  validateCorrected,
} from '../src/fabric-bench/fabric-bounds.js';
import {
  buildMeasurements,
  draftFromMeasurements,
  setDraftValue,
} from '../src/fabric-bench/measurement-draft.js';
import { BENCH_TESTS, BENCH_TEST_KEYS } from '../src/fabric-bench/measurement-fields.js';
import { poplinDraft } from './fabric-bench-fixtures.js';

const field = (path: string) => BENCH_TESTS.flatMap((t) => t.fields).find((f) => f.path === path);

describe('champs des essais, lus dans le contrat', () => {
  it('suit l’ordre et les essais du schéma', () => {
    expect(BENCH_TEST_KEYS).toEqual([
      'weighing',
      'thickness',
      'stretchWarp',
      'stretchWeft',
      'bendingWarp',
      'bendingWeft',
      'friction',
      'drape',
    ]);
  });

  it('lit les bornes dans les $defs', () => {
    expect(field('weighing.sampleAreaMm2')).toMatchObject({
      kind: 'number',
      min: 2500,
      max: 1_000_000,
    });
    expect(field('weighing.sampleMassG')).toMatchObject({ min: 0, max: 1000, minExclusive: true });
    expect(field('thickness.readingsMm')).toMatchObject({
      kind: 'series',
      min: 0.01,
      max: 10,
      maxItems: 32,
    });
    expect(field('friction.counterSurface')?.options).toContain('skin-substitute');
    expect(field('drape.specimenDiameterMm')).toMatchObject({ kind: 'fixed', fixed: 300 });
    expect(field('friction.slideAnglesDeg')?.minExclusive).toBe(true);
  });

  it('lit les bornes de Fabric dans son schéma', () => {
    expect(FABRIC_BOUNDS.weightGPerM2).toEqual({ minimum: 20, maximum: 800 });
    expect(FABRIC_BOUNDS.frictionCoefficient).toEqual({ minimum: 0, maximum: 1.5 });
  });
});

describe('buildMeasurements', () => {
  it('ignore sans erreur un brouillon vide', () => {
    expect(buildMeasurements({})).toEqual({ measurements: {}, errors: {} });
  });

  it('une saisie partielle donne des erreurs « required » et aucune mesure', () => {
    const { measurements, errors } = buildMeasurements({ 'stretchWarp.stripWidthMm': 50 });
    expect(measurements).toEqual({});
    expect(errors['stretchWarp.gaugeLengthMm']).toEqual({ code: 'required' });
    expect(errors['stretchWarp.loadedLengthMm']).toEqual({ code: 'required' });
    expect(errors['stretchWarp.hangingMassG']).toEqual({ code: 'required' });
  });

  it('construit les essais complets, avec les constantes du contrat', () => {
    const { measurements, errors } = buildMeasurements({
      ...poplinDraft,
      'drape.drapeCoefficient': 0.6,
    });
    expect(errors).toEqual({});
    expect(measurements.thickness).toEqual({ readingsMm: [0.2, 0.21] });
    expect(measurements.drape).toEqual({
      drapeCoefficient: 0.6,
      specimenDiameterMm: 300,
      discDiameterMm: 180,
    });
  });

  it('refuse une longueur chargée inférieure à la longueur au repos', () => {
    const draft = setDraftValue(poplinDraft, 'stretchWarp.loadedLengthMm', 190);
    const { measurements, errors } = buildMeasurements(draft);
    expect(errors['stretchWarp.loadedLengthMm']).toEqual({ code: 'loaded-shorter' });
    expect(measurements.stretchWarp).toBeUndefined();
    expect(measurements.weighing).toBeDefined();
  });

  it('indexe l’erreur d’une lecture hors bornes', () => {
    const draft = {
      'thickness.readingsMm.0': 0.2,
      'thickness.readingsMm.2': 50,
    };
    const { measurements, errors } = buildMeasurements(draft);
    expect(errors).toEqual({ 'thickness.readingsMm.2': { code: 'range', min: 0.01, max: 10 } });
    expect(measurements.thickness).toBeUndefined();
  });

  it('refuse un angle nul et une masse nulle (bornes exclusives)', () => {
    const { errors } = buildMeasurements({
      'friction.slideAnglesDeg.0': 0,
      'friction.counterSurface': 'other',
      'weighing.sampleMassG': 0,
      'weighing.sampleAreaMm2': 10_000,
    });
    expect(errors['friction.slideAnglesDeg.0']).toMatchObject({
      code: 'range',
      minExclusive: true,
    });
    expect(errors['weighing.sampleMassG']).toMatchObject({ code: 'range', minExclusive: true });
  });

  it('accepte 75° et refuse 0°, borne exclusive lue du contrat', () => {
    const at = (deg: number) =>
      buildMeasurements({ 'friction.slideAnglesDeg.0': deg, 'friction.counterSurface': 'other' });
    expect(at(75).errors).toEqual({});
    expect(at(0).errors['friction.slideAnglesDeg.0']).toEqual({
      code: 'range',
      min: 0,
      max: 75,
      minExclusive: true,
    });
  });

  it('refuse une surface d’appui inconnue', () => {
    const { errors } = buildMeasurements({
      'friction.slideAnglesDeg.0': 20,
      'friction.counterSurface': 'carpet',
    });
    expect(errors['friction.counterSurface']).toEqual({ code: 'required' });
  });

  it('rend le brouillon d’un jeu de mesures, et inversement', () => {
    const { measurements } = buildMeasurements({ ...poplinDraft, 'drape.drapeCoefficient': 0.6 });
    const draft = draftFromMeasurements(measurements);
    expect(draft['bendingWarp.overhangLengthsMm.1']).toBe(34);
    expect(draft['drape.specimenDiameterMm']).toBeUndefined();
    expect(buildMeasurements(draft).measurements).toEqual(measurements);
  });

  it('setDraftValue retire un champ vidé sans toucher l’original', () => {
    const next = setDraftValue(poplinDraft, 'weighing.sampleMassG', undefined);
    expect(Object.keys(next)).not.toContain('weighing.sampleMassG');
    expect(poplinDraft['weighing.sampleMassG']).toBe(1.2);
  });
});

describe('valeurs corrigées', () => {
  const full = {
    weightGPerM2: 120,
    thicknessMm: 0.2,
    stretchWarpPercent: 2,
    stretchWeftPercent: 3,
    bendingRigidityMicroNm: 6,
    frictionCoefficient: 0.35,
  };

  it('accepte six valeurs dans les bornes', () => {
    expect(validateCorrected(full)).toEqual({ corrected: full, errors: {} });
  });

  it('refuse une valeur hors bornes ou manquante', () => {
    const { corrected, errors } = validateCorrected({
      ...full,
      weightGPerM2: 9999,
      thicknessMm: undefined,
    });
    expect(corrected).toBeUndefined();
    expect(errors.weightGPerM2).toEqual({ code: 'range', min: 20, max: 800 });
    expect(errors.thicknessMm).toEqual({ code: 'required' });
  });

  it('arrondit à trois chiffres significatifs', () => {
    expect(
      roundToThreeDigits({ ...full, weightGPerM2: 123.456, frictionCoefficient: 0.123456 }),
    ).toMatchObject({
      weightGPerM2: 123,
      frictionCoefficient: 0.123,
    });
  });
});
