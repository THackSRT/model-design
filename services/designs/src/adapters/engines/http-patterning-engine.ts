import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import { contractValidator, requestJson } from '@atelier/service-kit';
import type {
  PatterningEngine,
  PatterningFailure,
} from '../../application/ports/patterning-engine.js';

const validSpec = contractValidator<GarmentSpec>('garmentSpec');

const detailOf = (body: unknown): string =>
  typeof body === 'object' && body !== null && 'detail' in body
    ? String(body.detail)
    : 'patron impossible';

/** Client HTTP du moteur de patronage : traduit ses réponses en résultats du domaine (anticorruption). */
export class HttpPatterningEngine implements PatterningEngine {
  constructor(private readonly options: { baseUrl: string; timeoutMs: number }) {}

  async draft(
    measurements: MeasurementSet,
    garment: GarmentRequest,
  ): Promise<Result<GarmentSpec, PatterningFailure>> {
    const response = await requestJson({
      url: `${this.options.baseUrl}/v1/patterns`,
      method: 'POST',
      body: { measurements, garment },
      timeoutMs: this.options.timeoutMs,
    });
    if (response.isErr()) {
      const failure = response.error;
      if (failure.kind === 'http-error' && failure.status === 422) {
        return err({ kind: 'pattern-impossible', detail: detailOf(failure.body) });
      }
      return err({ kind: 'engine-unavailable', detail: `moteur de patronage : ${failure.kind}` });
    }
    const spec = validSpec(response.value);
    return spec.isOk()
      ? ok(spec.value)
      : err({ kind: 'engine-unavailable', detail: 'réponse hors contrat' });
  }
}
