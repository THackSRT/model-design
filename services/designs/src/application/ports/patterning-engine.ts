import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import type { Result } from '@atelier/kernel';

/** Types de problèmes du moteur de patronage relayés tels quels (liste du contrat designs). */
export const PATTERNING_PROBLEM_TYPES = [
  'measurement-required',
  'inconsistent-measurements',
  'garment-type-not-supported',
  'skirt-shorter-than-hip-depth',
  'trousers-shorter-than-crotch',
  'trousers-hem-too-narrow',
  'neckline-too-deep',
  'sleeve-shorter-than-cap',
] as const;
export type PatterningProblemType = (typeof PATTERNING_PROBLEM_TYPES)[number];

export type PatterningFailure =
  | { kind: 'patterning-problem'; type: PatterningProblemType; detail: string }
  | { kind: 'pattern-impossible'; detail: string }
  | { kind: 'engine-unavailable'; detail: string };

/** Moteur de patronage : mesures + paramètres -> spécification de patron. */
export interface PatterningEngine {
  draft(
    measurements: MeasurementSet,
    garment: GarmentRequest,
  ): Promise<Result<GarmentSpec, PatterningFailure>>;
}
