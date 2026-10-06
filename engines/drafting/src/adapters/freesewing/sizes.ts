import { adult, sizes } from '@freesewing/models';
import { UnknownSizeError } from '../../core/errors.js';
import type { FreeSewingMeasurements } from '../../spec/measurements.js';

/** Nom d'une taille des tableaux adultes de FreeSewing : le nombre est le tour de cou en cm (`cisMaleAdult42`). */
export type SizeName = `cisFemaleAdult${number}` | `cisMaleAdult${number}`;

/** Toutes les tailles adultes, femmes puis hommes, dans l'ordre croissant. */
export const SIZE_NAMES: readonly SizeName[] = [
  ...sizes.cisFemaleAdult.map((neckCm): SizeName => `cisFemaleAdult${neckCm}`),
  ...sizes.cisMaleAdult.map((neckCm): SizeName => `cisMaleAdult${neckCm}`),
];

const SIZE_PATTERN = /^(cisFemale|cisMale)Adult(\d+)$/;

/**
 * Mesures d'une taille des tableaux de FreeSewing (`@freesewing/models`), en mm (degrés pour `shoulderSlope`). Rend
 * une copie : FreeSewing ne reçoit jamais l'objet du paquet. Erreur typée si la taille n'existe pas.
 */
export function sizeMeasurements(size: string): FreeSewingMeasurements {
  const match = SIZE_PATTERN.exec(size);
  const table =
    match === null ? undefined : adult[match[1] as 'cisFemale' | 'cisMale'][match[2] as string];
  if (table === undefined) throw new UnknownSizeError(size);
  return { ...table };
}
