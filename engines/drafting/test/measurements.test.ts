import type { MeasurementSet } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  DERIVABLE_MEASUREMENTS,
  HPS_ABOVE_CERVICALE_RATIO,
  InvalidMeasurementError,
  MAX_MEASUREMENT_MM,
  MAX_SLOPE_DEG,
  MissingMeasurementError,
  describeModel,
  toFreeSewingMeasurements,
} from '../src/index.js';

/** Un jeu où chaque champ a une valeur distincte : une erreur de correspondance ne passe pas inaperçue. */
const FULL: MeasurementSet = {
  sex: 'male',
  statureMm: 1800,
  neckGirthMm: 400,
  chestGirthMm: 1000,
  waistGirthMm: 900,
  hipGirthMm: 1050,
  upperArmGirthMm: 330,
  wristGirthMm: 180,
  thighGirthMm: 600,
  kneeGirthMm: 410,
  calfGirthMm: 380,
  ankleGirthMm: 240,
  crotchHeightMm: 800,
  bustGirthMm: 1010,
  underBustGirthMm: 880,
  cervicaleHeightMm: 1500,
  waistHeightMm: 1100,
  hipHeightMm: 850,
  backWaistLengthMm: 450,
  frontWaistLengthMm: 460,
  neckShoulderToBustPointMm: 300,
  bustPointWidthMm: 190,
  shoulderWidthMm: 460,
  armscyeDepthMm: 200,
  armLengthMm: 640,
  upperHipGirthMm: 940,
  waistGirthBackMm: 450,
  hipGirthBackMm: 560,
  shoulderSlopeDeg: 13,
  waistToArmpitMm: 220,
  waistToUpperHipMm: 140,
  crotchLengthMm: 900,
  frontCrotchLengthMm: 430,
  waistToThighMm: 360,
  highBustGirthMm: 1030,
  kneeHeightMm: 500,
};

/** La correspondance de docs/composants/contrats.md, pour ce jeu (homme). */
const EXPECTED: Record<string, number> = {
  neck: 400,
  chest: 1000,
  highBust: 1030,
  underbust: 880,
  waist: 900,
  hips: 940,
  seat: 1050,
  waistBack: 450,
  seatBack: 560,
  biceps: 330,
  wrist: 180,
  upperLeg: 600,
  knee: 410,
  ankle: 240,
  inseam: 800,
  waistToFloor: 1100,
  waistToSeat: 250, // waistHeightMm − hipHeightMm
  waistToKnee: 600, // waistHeightMm − kneeHeightMm
  hpsToWaistBack: 470, // backWaistLengthMm + 5 % du tour de cou
  hpsToWaistFront: 460,
  hpsToBust: 300,
  bustSpan: 190,
  shoulderToShoulder: 460,
  shoulderSlope: 13,
  shoulderToWrist: 640,
  waistToArmpit: 220,
  waistToHips: 140,
  waistToUpperLeg: 360,
  crossSeam: 900,
  crossSeamFront: 430,
};

const convert = (
  set: MeasurementSet,
  required: readonly string[],
  optional: readonly string[] = [],
) => toFreeSewingMeasurements('test', set, { required, optional });

const without = (...fields: (keyof MeasurementSet)[]): MeasurementSet =>
  Object.fromEntries(
    Object.entries(FULL).filter(([key]) => !fields.includes(key as keyof MeasurementSet)),
  ) as unknown as MeasurementSet;

describe('toFreeSewingMeasurements : correspondance', () => {
  it('convertit chaque mesure comme le tableau de docs/composants/contrats.md', () => {
    expect(convert(FULL, DERIVABLE_MEASUREMENTS)).toEqual(EXPECTED);
    expect([...DERIVABLE_MEASUREMENTS].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('couvre les mesures exigées par Brian', () => {
    const { measurements, optionalMeasurements } = describeModel('brian');
    for (const name of [...measurements, ...optionalMeasurements]) {
      expect(DERIVABLE_MEASUREMENTS).toContain(name);
    }
  });

  it('femme : chest vient du tour de buste s’il est fourni, sinon du tour de poitrine', () => {
    const woman = { ...FULL, sex: 'female' } as const;
    expect(convert(woman, ['chest']).chest).toBe(1010);
    expect(convert(without('bustGirthMm'), ['chest']).chest).toBe(1000);
    expect(convert({ ...without('bustGirthMm'), sex: 'female' }, ['chest']).chest).toBe(1000);
  });

  it('homme : chest vient du tour de poitrine, même si le tour de buste est fourni', () => {
    expect(convert(FULL, ['chest']).chest).toBe(1000);
  });

  it('hpsToWaistBack ajoute l’écart entre le point d’encolure et la cervicale (5 % du tour de cou)', () => {
    expect(HPS_ABOVE_CERVICALE_RATIO).toBe(0.05);
    expect(convert(FULL, ['hpsToWaistBack']).hpsToWaistBack).toBe(450 + 0.05 * 400);
    // 0,05 × 420 vaut 21,000000000000004 en virgule flottante : la sortie est arrondie à 0,001 mm.
    const set = { ...FULL, neckGirthMm: 420, backWaistLengthMm: 481 };
    expect(convert(set, ['hpsToWaistBack']).hpsToWaistBack).toBe(502);
    expect(convert({ ...FULL, neckGirthMm: 417 }, ['hpsToWaistBack']).hpsToWaistBack).toBe(470.85);
  });

  it('ne rend que les mesures demandées : exigées, puis facultatives présentes', () => {
    expect(Object.keys(convert(FULL, ['neck', 'wrist'], ['highBust']))).toEqual([
      'neck',
      'wrist',
      'highBust',
    ]);
    expect(Object.keys(convert(without('highBustGirthMm'), ['neck'], ['highBust']))).toEqual([
      'neck',
    ]);
  });

  it('ignore une mesure facultative qu’aucun champ ne fournit', () => {
    expect(Object.keys(convert(FULL, ['neck'], ['head']))).toEqual(['neck']);
  });
});

describe('toFreeSewingMeasurements : mesures manquantes', () => {
  it('nomme toutes les mesures qui manquent, avec les champs du jeu qui les fourniraient', () => {
    const { measurements } = describeModel('brian');
    try {
      convert(without('shoulderSlopeDeg', 'neckGirthMm'), measurements);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingMeasurementError);
      const missing = (error as MissingMeasurementError).missing;
      // Dans l'ordre des mesures exigées par Brian.
      expect(missing).toEqual([
        { measurement: 'hpsToWaistBack', fields: ['neckGirthMm'] },
        { measurement: 'neck', fields: ['neckGirthMm'] },
        { measurement: 'shoulderSlope', fields: ['shoulderSlopeDeg'] },
      ]);
      const message = (error as Error).message;
      expect(message).toContain('shoulderSlopeDeg (shoulderSlope)');
      expect(message).toContain('neckGirthMm (neck)');
      expect(message).toContain('model test');
      expect((error as MissingMeasurementError).code).toBe('missing-measurement');
    }
  });

  it('nomme les deux champs d’une différence quand ils manquent tous les deux', () => {
    const attempt = (): unknown =>
      convert(without('waistHeightMm', 'hipHeightMm'), ['waistToSeat']);
    expect(attempt).toThrow('waistHeightMm + hipHeightMm (waistToSeat)');
  });

  it('signale une mesure que le jeu ne sait pas fournir', () => {
    const attempt = (): unknown => convert(FULL, ['head']);
    expect(attempt).toThrow('no MeasurementSet field (head)');
  });

  it('ne met jamais la valeur d’une mesure dans le message (donnée personnelle)', () => {
    const messages = [
      () => convert(without('shoulderSlopeDeg'), ['shoulderSlope', 'chest']),
      () => convert({ ...FULL, chestGirthMm: -1234 }, ['chest']),
      () => convert({ ...FULL, chestGirthMm: 987654 }, ['chest']),
    ].map((run) => {
      try {
        run();
      } catch (error) {
        return (error as Error).message;
      }
      return expect.unreachable();
    });
    for (const message of messages) {
      for (const value of ['1000', '1234', '987654', '460', '450'])
        expect(message).not.toContain(value);
    }
  });
});

describe('toFreeSewingMeasurements : mesures inutilisables', () => {
  it.each([
    ['négative', -5],
    ['nulle', 0],
    ['NaN', Number.NaN],
    ['infinie', Number.POSITIVE_INFINITY],
    ['du mauvais type', '1000'],
  ])('refuse une mesure %s', (_name, value) => {
    const set = { ...FULL, chestGirthMm: value } as unknown as MeasurementSet;
    try {
      convert(set, ['chest']);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidMeasurementError);
      expect(error).toMatchObject({ code: 'invalid-measurement', field: 'chestGirthMm' });
      expect((error as InvalidMeasurementError).reason).toContain('above 0');
    }
  });

  it('refuse une mesure démesurée : FreeSewing met des secondes à ajuster une manche de 1e5 fois une taille', () => {
    expect(MAX_MEASUREMENT_MM).toBe(5000);
    expect(convert({ ...FULL, chestGirthMm: 5000 }, ['chest']).chest).toBe(5000);
    const attempt = (): unknown => convert({ ...FULL, chestGirthMm: 5001 }, ['chest']);
    expect(attempt).toThrow(InvalidMeasurementError);
    expect(attempt).toThrow(
      'measurement chestGirthMm must be a finite number above 0 and at most 5000 mm',
    );
    const huge = { ...FULL, upperArmGirthMm: 3.87e11, wristGirthMm: 1.84e11 };
    expect(() => convert(huge, ['biceps', 'wrist'])).toThrow(InvalidMeasurementError);
  });

  it('refuse une pente d’épaule d’un angle droit ou plus : FreeSewing y échoue', () => {
    expect(MAX_SLOPE_DEG).toBe(90);
    expect(convert({ ...FULL, shoulderSlopeDeg: 89 }, ['shoulderSlope']).shoulderSlope).toBe(89);
    for (const shoulderSlopeDeg of [90, 91, 360, 1e6]) {
      const attempt = (): unknown => convert({ ...FULL, shoulderSlopeDeg }, ['shoulderSlope']);
      expect(attempt).toThrow(
        'measurement shoulderSlopeDeg must be a finite angle from 0 to under 90 degrees',
      );
    }
  });

  it('accepte une pente d’épaule nulle (épaules horizontales) mais pas négative', () => {
    expect(convert({ ...FULL, shoulderSlopeDeg: 0 }, ['shoulderSlope']).shoulderSlope).toBe(0);
    const attempt = (): unknown => convert({ ...FULL, shoulderSlopeDeg: -1 }, ['shoulderSlope']);
    expect(attempt).toThrow(InvalidMeasurementError);
  });

  it('contrôle aussi le tour de buste d’une femme, utilisé pour chest', () => {
    const set = { ...FULL, sex: 'female', bustGirthMm: Number.NaN } as MeasurementSet;
    expect(() => convert(set, ['chest'])).toThrow(InvalidMeasurementError);
  });

  it('refuse une différence qui n’a pas de sens (hanches plus hautes que la taille)', () => {
    const attempt = (): unknown => convert({ ...FULL, hipHeightMm: 1200 }, ['waistToSeat']);
    expect(attempt).toThrow(InvalidMeasurementError);
    expect(attempt).toThrow('waistHeightMm - hipHeightMm');
  });

  it('ne contrôle pas les champs dont aucune mesure demandée ne dépend', () => {
    const set = { ...FULL, calfGirthMm: Number.NaN } as MeasurementSet;
    expect(convert(set, ['neck']).neck).toBe(400);
  });
});
