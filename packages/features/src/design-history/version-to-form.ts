import type { DesignVersion } from '@atelier/contracts-ts';
import { mmToCm } from '@atelier/kernel';
import {
  garmentFields,
  type GarmentField,
  type ParamValues,
  sleeveFields,
} from '../pattern-studio/garment-fields.js';
import {
  initialForm,
  type MeasurementKey,
  measurementKeys,
  type StudioForm,
} from '../pattern-studio/form.js';

/** Toutes les mesures du formulaire (les quatre communes et celles des tracés particuliers). */
const FORM_MEASUREMENTS: readonly MeasurementKey[] = [
  ...new Set([...measurementKeys('trousers'), ...measurementKeys('bodice')]),
];

/** Valeurs du contrat (mm, ratio) vers la saisie : cm pour une longueur, tel quel sinon. Champ absent : absent. */
function paramsToInput(fields: GarmentField[], params: Record<string, unknown>): ParamValues {
  const input: ParamValues = {};
  for (const field of fields) {
    const value = params[field.param];
    if (typeof value !== 'number') continue;
    input[field.param] = field.unit === 'cm' ? mmToCm(value) : value;
  }
  return input;
}

/**
 * Formulaire du studio qui redonne une version : mesures (mm vers cm), type et paramètres. Ce qui n'était
 * pas dans la version reste absent (jamais complété par un défaut : la reprise est fidèle). La saisie des
 * autres types vient de `base` et n'est pas perdue.
 */
export function versionToForm(
  version: Pick<DesignVersion, 'measurements' | 'garment'>,
  base: StudioForm = initialForm,
): StudioForm {
  const { measurements, garment } = version;
  const stored = measurements as unknown as Record<string, number | undefined>;
  const measurementsCm: StudioForm['measurementsCm'] = {};
  for (const key of FORM_MEASUREMENTS) {
    const mm = stored[key];
    if (mm !== undefined) measurementsCm[key] = mmToCm(mm);
  }
  const params = garment.params as unknown as Record<string, unknown>;
  const sleeve = garment.type === 'bodice' ? garment.params.sleeve : undefined;
  return {
    ...base,
    sex: measurements.sex,
    garmentType: garment.type,
    measurementsCm,
    paramsByType: {
      ...base.paramsByType,
      [garment.type]: paramsToInput(garmentFields(garment.type), params),
    },
    withSleeve: sleeve !== undefined,
    sleeveCm: sleeve
      ? paramsToInput(sleeveFields(), sleeve as unknown as Record<string, unknown>)
      : base.sleeveCm,
  };
}
