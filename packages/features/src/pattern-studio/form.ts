import {
  jsonSchemas,
  type CreateDesignVersionRequest,
  type MeasurementSet,
} from '@atelier/contracts-ts';
import { cmToMm, err, ok, type Result } from '@atelier/kernel';

/** Saisie de l'écran, en centimètres (l'unité des tailleurs) ; convertie en mm pour le contrat. */
export interface StudioForm {
  sex: MeasurementSet['sex'];
  measurementsCm: Partial<Record<MeasurementKey, number>>;
  skirtCm: { length?: number; waistEase?: number; hipEase?: number; hemFlare?: number };
}

export type MeasurementKey = 'statureMm' | 'chestGirthMm' | 'waistGirthMm' | 'hipGirthMm';
export const MEASUREMENT_KEYS: MeasurementKey[] = [
  'statureMm',
  'chestGirthMm',
  'waistGirthMm',
  'hipGirthMm',
];

export type FieldErrors = Partial<Record<MeasurementKey | 'length', string>>;

export const initialForm: StudioForm = {
  sex: 'female',
  measurementsCm: { statureMm: 165, chestGirthMm: 88, waistGirthMm: 70, hipGirthMm: 96 },
  skirtCm: { length: 60, waistEase: 1, hipEase: 4, hemFlare: 0 },
};

type Bounds = { minimum: number; maximum: number };
const measurementBounds = (key: MeasurementKey): Bounds =>
  jsonSchemas.measurementSet.properties[key];
const lengthBounds: Bounds =
  jsonSchemas.garmentRequest.$defs.StraightSkirtParams.properties.lengthMm;

const toMm = (cm: number | undefined) => (cm === undefined ? undefined : Math.round(cmToMm(cm)));

function checkMm(value: number | undefined, bounds: Bounds): string | undefined {
  if (value === undefined) return 'obligatoire';
  if (value < bounds.minimum || value > bounds.maximum) {
    return `entre ${bounds.minimum / 10} et ${bounds.maximum / 10} cm`;
  }
  return undefined;
}

/** Convertit et valide la saisie avec les bornes du contrat, la même règle que le service. */
export function toVersionRequest(
  form: StudioForm,
): Result<CreateDesignVersionRequest, FieldErrors> {
  const errors: FieldErrors = {};
  const measurements: Record<string, number> = {};
  for (const key of MEASUREMENT_KEYS) {
    const mm = toMm(form.measurementsCm[key]);
    const problem = checkMm(mm, measurementBounds(key));
    if (problem) errors[key] = problem;
    else if (mm !== undefined) measurements[key] = mm;
  }
  const lengthMm = toMm(form.skirtCm.length);
  const lengthProblem = checkMm(lengthMm, lengthBounds);
  if (lengthProblem) errors.length = lengthProblem;
  if (Object.keys(errors).length > 0 || lengthMm === undefined) return err(errors);
  const params = {
    lengthMm,
    waistEaseMm: toMm(form.skirtCm.waistEase) ?? 10,
    hipEaseMm: toMm(form.skirtCm.hipEase) ?? 40,
    hemFlareMm: toMm(form.skirtCm.hemFlare) ?? 0,
  };
  return ok({
    measurements: { sex: form.sex, ...measurements } as MeasurementSet,
    garment: { type: 'straight-skirt', params },
  });
}
