import type { FinishedField, FinishedKey, StudioForm } from '@atelier/features';

/** Paramètres du contrat remplacés dans le panneau par une mesure finie (aisances de tour et longueur). */
const REPLACED_PARAMS: ReadonlySet<string> = new Set([
  'waistEaseMm',
  'hipEaseMm',
  'bustEaseMm',
  'lengthMm',
]);

/** Vrai si le champ de paramètre est remplacé par une mesure finie. */
export const isReplacedParam = (param: string): boolean => REPLACED_PARAMS.has(param);

/** Ce qui est remplacé n'est pas la tête ni le bas de manche : seule la longueur de manche l'est. */
export const isReplacedSleeveParam = (param: string): boolean => param === 'lengthMm';

const isGirth = (key: FinishedKey): key is 'waistGirthMm' | 'hipGirthMm' | 'bustGirthMm' =>
  key.endsWith('GirthMm');

/** Aisance (cm) d'une mesure finie de tour : mesure finie moins mesure du corps ; absente sans l'une des deux. */
export function easeCm(
  field: FinishedField,
  measurementsCm: StudioForm['measurementsCm'],
): number | undefined {
  if (!isGirth(field.key) || field.valueCm === undefined) return undefined;
  const body = measurementsCm[field.key];
  if (body === undefined) return undefined;
  return Math.round((field.valueCm - body) * 10) / 10;
}
