import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import type { Result } from '@atelier/kernel';

export type PatterningFailure =
  { kind: 'pattern-impossible'; detail: string } | { kind: 'engine-unavailable'; detail: string };

/** Moteur de patronage : mesures + paramètres -> spécification de patron. */
export interface PatterningEngine {
  draft(
    measurements: MeasurementSet,
    garment: GarmentRequest,
  ): Promise<Result<GarmentSpec, PatterningFailure>>;
}
