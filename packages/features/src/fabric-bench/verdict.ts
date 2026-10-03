import type { FabricPresetReview } from '@atelier/contracts-ts';
import { type Deviation, drapeCoefficientWithinTolerance } from '@atelier/drape';

export type Verdict = FabricPresetReview['verdict'];

export const VERDICTS: readonly Verdict[] = ['validated', 'corrected', 'to-review'];

export interface DrapeEvidence {
  /** Coefficient de drapé mesuré au drapomètre. */
  measured?: number;
  /** Coefficient de drapé simulé avec les valeurs estimées. */
  simulatedEstimated?: number;
}

/**
 * Verdict proposé (ADR 0015) : aucune mesure comparable -> à reprendre ; une grandeur ou le coefficient de drapé
 * hors tolérance -> corrigé ; sinon validé. Le coefficient mesuré ne compte que s'il y a un essai simulé à lui comparer.
 */
export function suggestVerdict(deviations: readonly Deviation[], drape: DrapeEvidence): Verdict {
  const { measured, simulatedEstimated } = drape;
  const dcCompared = measured !== undefined && simulatedEstimated !== undefined;
  if (deviations.length === 0 && !dcCompared) return 'to-review';
  const dcOut =
    measured !== undefined &&
    simulatedEstimated !== undefined &&
    !drapeCoefficientWithinTolerance(measured, simulatedEstimated);
  return dcOut || deviations.some((d) => !d.withinTolerance) ? 'corrected' : 'validated';
}
