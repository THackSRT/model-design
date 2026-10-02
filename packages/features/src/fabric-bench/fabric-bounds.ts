import { fabricJsonSchema, fabricPresetReviewJsonSchema } from '@atelier/contracts-ts';
import {
  FABRIC_PROPERTIES,
  type FabricBounds,
  type FabricPhysics,
  type FabricProperty,
} from '@atelier/drape';

import type { BenchError } from './measurement-draft.js';

/** Bornes de chaque propriété de `Fabric`, lues dans le schéma du contrat (jamais recopiées). */
export const FABRIC_BOUNDS: FabricBounds = Object.fromEntries(
  FABRIC_PROPERTIES.map((property) => {
    const { minimum, maximum } = fabricJsonSchema.properties[property];
    return [property, { minimum, maximum }];
  }),
) as FabricBounds;

/** Longueur maximale du commentaire (caractères), lue dans le contrat. */
export const COMMENT_MAX_LENGTH: number = fabricPresetReviewJsonSchema.properties.comment.maxLength;

/** Valeurs corrigées en cours de saisie (une propriété peut être vide ou hors bornes). */
export type CorrectedDraft = Partial<Record<FabricProperty, number>>;
export type CorrectedErrors = Partial<Record<FabricProperty, BenchError>>;

export interface CorrectedCheck {
  /** Présent seulement quand les six propriétés sont valides. */
  corrected?: FabricPhysics;
  errors: CorrectedErrors;
}

export function validateCorrected(draft: CorrectedDraft): CorrectedCheck {
  const errors: CorrectedErrors = {};
  for (const property of FABRIC_PROPERTIES) {
    const value = draft[property];
    const { minimum, maximum } = FABRIC_BOUNDS[property];
    if (value === undefined) errors[property] = { code: 'required' };
    else if (!(value >= minimum && value <= maximum)) {
      errors[property] = { code: 'range', min: minimum, max: maximum };
    }
  }
  return Object.keys(errors).length === 0
    ? { corrected: draft as FabricPhysics, errors }
    : { errors };
}

/** Valeurs candidates arrondies à 3 chiffres significatifs : de quoi préremplir une correction lisible. */
export function roundToThreeDigits(fabric: FabricPhysics): FabricPhysics {
  const rounded = { ...fabric };
  for (const property of FABRIC_PROPERTIES)
    rounded[property] = Number(fabric[property].toPrecision(3));
  return rounded;
}
