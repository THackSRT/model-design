import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import type {
  PatterningEngine,
  PatterningFailure,
} from '../../src/application/ports/patterning-engine.js';
import { aSpec } from '../builders.js';

/** Moteur de patronage simulé : rend un patron fixe, ou l'échec qu'on lui a demandé. */
export class FakePatterningEngine implements PatterningEngine {
  calls: { measurements: MeasurementSet; garment: GarmentRequest }[] = [];
  constructor(private readonly outcome: GarmentSpec | PatterningFailure = aSpec()) {}

  async draft(
    measurements: MeasurementSet,
    garment: GarmentRequest,
  ): Promise<Result<GarmentSpec, PatterningFailure>> {
    this.calls.push({ measurements, garment });
    return 'kind' in this.outcome ? err(this.outcome) : ok(this.outcome);
  }
}
