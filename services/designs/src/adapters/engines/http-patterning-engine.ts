import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import { contractValidator, type HttpFailure, requestJson } from '@atelier/service-kit';
import {
  PATTERNING_PROBLEM_TYPES,
  type PatterningEngine,
  type PatterningFailure,
  type PatterningProblemType,
} from '../../application/ports/patterning-engine.js';

const validSpec = contractValidator<GarmentSpec>('garmentSpec');

/** Détail fixé par le service pour un type de problème inconnu : le corps du moteur n'est pas recopié. */
const IMPOSSIBLE_DETAIL = 'Patron impossible à tracer avec ces mesures et paramètres.';

const field = (body: unknown, name: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[name] : undefined;

/** Suffixe d'un type `/problems/<x>` ; undefined si le type est absent ou mal formé. */
const problemTypeOf = (body: unknown): string | undefined => {
  const raw = field(body, 'type');
  return typeof raw === 'string' && raw.startsWith('/problems/') && raw.length > 10
    ? raw.slice('/problems/'.length)
    : undefined;
};

const isKnown = (type: string): type is PatterningProblemType =>
  (PATTERNING_PROBLEM_TYPES as readonly string[]).includes(type);

function failureOf(failure: HttpFailure): PatterningFailure {
  if (failure.kind === 'http-error' && failure.status === 422) {
    const type = problemTypeOf(failure.body);
    if (type !== undefined && isKnown(type)) {
      const detail = field(failure.body, 'detail');
      return {
        kind: 'patterning-problem',
        type,
        detail: typeof detail === 'string' ? detail : IMPOSSIBLE_DETAIL,
      };
    }
    if (type !== undefined) return { kind: 'pattern-impossible', detail: IMPOSSIBLE_DETAIL };
  }
  // Validation du moteur (corps qui recopie les mesures reçues), panne, délai : corps jamais relayé.
  return { kind: 'engine-unavailable', detail: `moteur de patronage : ${failure.kind}` };
}

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
    if (response.isErr()) return err(failureOf(response.error));
    const spec = validSpec(response.value);
    return spec.isOk()
      ? ok(spec.value)
      : err({ kind: 'engine-unavailable', detail: 'réponse hors contrat' });
  }
}
