import type { Clock } from '@atelier/kernel';
import type { DrapeOutcome } from '../../domain/drape.js';
import type { DrapeLocation, DrapeRepository, RecordedOutcome } from '../ports/drape-repository.js';

export interface RecordDrapeOutcomeInput extends DrapeLocation {
  outcome: DrapeOutcome;
}

/**
 * Reçoit le résultat du moteur (drape.completed / drape.failed). Idempotent : le premier résultat gagne, un
 * doublon ou un drapé inconnu (ou d'une autre organisation) ne change rien et n'est pas une erreur.
 */
export const recordDrapeOutcome =
  (deps: { drapes: DrapeRepository; clock: Clock }) =>
  async ({ outcome, ...location }: RecordDrapeOutcomeInput): Promise<RecordedOutcome> =>
    deps.drapes.recordOutcome(location, outcome, deps.clock.now());
