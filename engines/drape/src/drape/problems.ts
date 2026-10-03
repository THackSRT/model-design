import { InvalidInputError } from '../core/validate.js';
import { DrapeTooLargeError } from '../mesh/limits.js';
import { PlacementError } from '../placement/types.js';

/**
 * Cause stable d'un échec de drapé (ADR 0013). Les quatre premières et `drape-too-large` sont les types de
 * `drape.failed` ; `invalid-input` est un patron que le maillage refuse (contour croisé, couture inconnue…).
 * Jamais de texte libre ni de mesure.
 */
export type DrapeProblemType =
  | 'placement-missing'
  | 'placement-failed'
  | 'seam-not-closed'
  | 'body-penetration'
  | 'drape-too-large'
  | 'invalid-input';

export interface DrapeProblem {
  type: DrapeProblemType;
  /** Pièce en cause, si elle est connue. */
  panelId?: string;
}

/** Problème correspondant à une erreur attendue du moteur ; `undefined` pour toute autre (bogue : on la relance). */
export function problemOf(error: unknown): DrapeProblem | undefined {
  if (error instanceof PlacementError) {
    return error.panelId === undefined
      ? { type: error.code }
      : { type: error.code, panelId: error.panelId };
  }
  if (error instanceof DrapeTooLargeError) return { type: 'drape-too-large' };
  if (error instanceof InvalidInputError && error.code === 'mesh') return { type: 'invalid-input' };
  return undefined;
}
