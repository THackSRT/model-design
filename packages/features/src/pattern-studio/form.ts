import {
  measurementSetJsonSchema,
  type CreateDesignVersionRequest,
  type GarmentRequest,
  type GarmentType,
  type MeasurementSet,
} from '@atelier/contracts-ts';
import { cmToMm, err, ok, type Result } from '@atelier/kernel';
import {
  DRAFTED_GARMENT_TYPES,
  garmentFields,
  sleeveFields,
  type GarmentField,
  initialParams,
  initialSleeve,
  type DraftedGarmentType,
  isDraftedGarmentType,
  type ParamValues,
} from './garment-fields.js';
import {
  type FinishedByType,
  initialFinished,
  liftFinishedErrors,
  syncFinished,
} from './garment-measures.js';

/** Saisie de l'écran, en centimètres (l'unité des tailleurs) ; convertie en mm pour le contrat. */
export interface StudioForm {
  sex: MeasurementSet['sex'];
  garmentType: GarmentType;
  measurementsCm: Partial<Record<MeasurementKey, number>>;
  /** Saisie de chaque type (cm, ou ratio) : changer de type puis revenir ne perd rien. */
  paramsByType: Partial<Record<GarmentType, ParamValues>>;
  /** Corsage : manches facultatives (case cochée) et leur saisie, gardée même décochée. */
  withSleeve: boolean;
  sleeveCm: ParamValues;
  /** Mesures finies du vêtement (cm) de chaque type, avec leur origine (calculée ou saisie). */
  finished: FinishedByType;
}

export type MeasurementKey =
  | 'statureMm'
  | 'chestGirthMm'
  | 'waistGirthMm'
  | 'hipGirthMm'
  | 'crotchHeightMm'
  | 'bustGirthMm'
  | 'backWaistLengthMm'
  | 'waistHeightMm'
  | 'armLengthMm';
export const MEASUREMENT_KEYS: MeasurementKey[] = [
  'statureMm',
  'chestGirthMm',
  'waistGirthMm',
  'hipGirthMm',
];

const EXTRA_MEASUREMENTS: Partial<Record<GarmentType, MeasurementKey[]>> = {
  trousers: ['crotchHeightMm'],
  bodice: ['bustGirthMm', 'backWaistLengthMm'],
};

/** Mesures demandées : les quatre du contrat, plus celles que le tracé du type exige (ADR 0010). */
export function measurementKeys(type: GarmentType): MeasurementKey[] {
  return [...MEASUREMENT_KEYS, ...(EXTRA_MEASUREMENTS[type] ?? [])];
}

const OPTIONAL_MEASUREMENTS: Partial<Record<GarmentType, MeasurementKey[]>> = {
  'straight-skirt': ['waistHeightMm'],
  'circle-skirt': ['waistHeightMm'],
  trousers: ['waistHeightMm'],
  bodice: ['armLengthMm'],
};

/** Mesures facultatives du corps : elles affinent les longueurs proposées et sont envoyées si saisies. */
export function optionalMeasurementKeys(type: GarmentType): MeasurementKey[] {
  return OPTIONAL_MEASUREMENTS[type] ?? [];
}

/** Erreur de saisie : un code et ses paramètres (mm), traduits par l'application. */
export type FieldError =
  | { code: 'required' }
  | { code: 'unavailable' }
  | { code: 'range'; minMm: number; maxMm: number }
  /** Mesure finie dont l’aisance (mesure moins corps) sort de minMm à maxMm, bornes de l’aisance affichée : trop serrée, ou trop ample. */
  | { code: 'easeRange'; minMm: number; maxMm: number }
  | { code: 'zeroOrRange'; minMm: number; maxMm: number }
  | { code: 'ratioRange'; min: number; max: number };
/** Indexée par nom de paramètre ou de mesure du contrat. */
export type FieldErrors = Partial<Record<string, FieldError>>;

const baseForm: StudioForm = {
  sex: 'female',
  garmentType: 'straight-skirt',
  measurementsCm: {
    statureMm: 165,
    chestGirthMm: 88,
    waistGirthMm: 70,
    hipGirthMm: 96,
    crotchHeightMm: 78,
    bustGirthMm: 92,
    backWaistLengthMm: 40,
  },
  paramsByType: Object.fromEntries(DRAFTED_GARMENT_TYPES.map((t) => [t, initialParams(t)])),
  withSleeve: false,
  sleeveCm: initialSleeve(),
  finished: initialFinished(),
};

/** Formulaire de départ : les mesures finies sont proposées depuis le corps (`auto`). */
export const initialForm: StudioForm = syncFinished(baseForm);

type Bounds = { minimum: number; maximum: number };
const measurementBounds = (key: MeasurementKey): Bounds => measurementSetJsonSchema.properties[key];

const toMm = (cm: number | undefined) => (cm === undefined ? undefined : Math.round(cmToMm(cm)));

function checkMm(value: number | undefined, bounds: Bounds): FieldError | undefined {
  if (value === undefined) return { code: 'required' };
  if (value < bounds.minimum || value > bounds.maximum) {
    return { code: 'range', minMm: bounds.minimum, maxMm: bounds.maximum };
  }
  return undefined;
}

type Checked = { value?: number; error?: FieldError };

function checkRatio(field: GarmentField, input: number): Checked {
  if (input >= field.minimum && input <= field.maximum) return { value: input };
  return { error: { code: 'ratioRange', min: field.minimum, max: field.maximum } };
}

function checkLength(field: GarmentField, input: number): Checked {
  const mm = toMm(input) as number;
  if (field.zeroAllowed) {
    const valid = mm === 0 || (mm >= field.minimum && mm <= field.maximum);
    const error: FieldError = { code: 'zeroOrRange', minMm: field.minimum, maxMm: field.maximum };
    return valid ? { value: mm } : { error };
  }
  const error = checkMm(mm, { minimum: field.minimum, maximum: field.maximum });
  return error ? { error } : { value: mm };
}

/** Valeur contractuelle d'un champ (mm entiers pour une longueur) ou son erreur ; vide et facultatif : omis. */
function checkField(field: GarmentField, input: number | undefined): Checked {
  if (input === undefined) return field.required ? { error: { code: 'required' } } : {};
  return field.unit === 'ratio' ? checkRatio(field, input) : checkLength(field, input);
}

function checkMeasurements(form: StudioForm, errors: FieldErrors): Record<string, number> {
  const measurements: Record<string, number> = {};
  for (const key of measurementKeys(form.garmentType)) {
    const mm = toMm(form.measurementsCm[key]);
    const problem = checkMm(mm, measurementBounds(key));
    if (problem) errors[key] = problem;
    else if (mm !== undefined) measurements[key] = mm;
  }
  for (const key of optionalMeasurementKeys(form.garmentType)) {
    const mm = toMm(form.measurementsCm[key]);
    if (mm === undefined) continue;
    const problem = checkMm(mm, measurementBounds(key));
    if (problem) errors[key] = problem;
    else measurements[key] = mm;
  }
  return measurements;
}

function checkFields(
  fields: GarmentField[],
  inputs: ParamValues,
  errors: FieldErrors,
  prefix = '',
): Record<string, number> {
  const params: Record<string, number> = {};
  for (const field of fields) {
    const { value, error } = checkField(field, inputs[field.param]);
    if (error) errors[`${prefix}${field.param}`] = error;
    else if (value !== undefined) params[field.param] = value;
  }
  return params;
}

function checkParams(form: StudioForm, type: DraftedGarmentType, errors: FieldErrors) {
  const params: Record<string, unknown> = checkFields(
    garmentFields(type),
    form.paramsByType[type] ?? {},
    errors,
  );
  if (type === 'bodice' && form.withSleeve) {
    params.sleeve = checkFields(sleeveFields(), form.sleeveCm, errors, 'sleeve.');
  }
  return params;
}

/** Convertit et valide la saisie avec les bornes du contrat, la même règle que le service. */
export function toVersionRequest(
  form: StudioForm,
): Result<CreateDesignVersionRequest, FieldErrors> {
  const type = form.garmentType;
  if (!isDraftedGarmentType(type)) return err({ garmentType: { code: 'unavailable' } });
  const errors: FieldErrors = {};
  const measurements = checkMeasurements(form, errors);
  const params = checkParams(form, type, errors);
  const lifted = liftFinishedErrors(type, errors);
  if (Object.keys(lifted).length > 0) return err(lifted);
  return ok({
    // params est bâti champ par champ depuis les schémas du contrat : le service revalide.
    measurements: { sex: form.sex, ...measurements } as MeasurementSet,
    garment: { type, params } as unknown as GarmentRequest,
  });
}
