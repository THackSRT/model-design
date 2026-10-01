import type { CutPattern, GarmentSpec } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import {
  contractValidator,
  type HttpFailure,
  requestBytes,
  requestJson,
} from '@atelier/service-kit';
import {
  type CutPatternOptionsInput,
  type ExportOptionsInput,
  MANUFACTURING_PROBLEM_TYPES,
  type ManufacturingEngine,
  type ManufacturingFailure,
  type ManufacturingProblemType,
} from '../../application/ports/manufacturing-engine.js';

const validCutPattern = contractValidator<CutPattern>('cutPattern');

const field = (body: unknown, name: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[name] : undefined;

const knownType = (body: unknown): ManufacturingProblemType | undefined => {
  const raw = field(body, 'type');
  if (typeof raw !== 'string' || !raw.startsWith('/problems/')) return undefined;
  const type = raw.slice('/problems/'.length);
  return (MANUFACTURING_PROBLEM_TYPES as readonly string[]).includes(type)
    ? (type as ManufacturingProblemType)
    : undefined;
};

function failureOf(failure: HttpFailure): ManufacturingFailure {
  if (failure.kind === 'http-error' && failure.status === 422) {
    const type = knownType(failure.body);
    const detail = field(failure.body, 'detail');
    if (type) {
      return {
        kind: 'manufacturing-problem',
        type,
        detail: typeof detail === 'string' ? detail : 'pièces impossibles à finir',
      };
    }
  }
  return { kind: 'engine-unavailable', detail: `moteur de fabrication : ${failure.kind}` };
}

/** Client HTTP du moteur de fabrication : anticorruption (types d'erreur en liste blanche, réponses revalidées). */
export class HttpManufacturingEngine implements ManufacturingEngine {
  constructor(private readonly options: { baseUrl: string; timeoutMs: number }) {}

  async cutPattern(
    spec: GarmentSpec,
    options: CutPatternOptionsInput,
  ): Promise<Result<CutPattern, ManufacturingFailure>> {
    const response = await requestJson({
      url: `${this.options.baseUrl}/v1/cut-patterns`,
      method: 'POST',
      body: { spec, finishing: options.finishing, sizeLabel: options.sizeLabel },
      timeoutMs: this.options.timeoutMs,
    });
    if (response.isErr()) return err(failureOf(response.error));
    const pattern = validCutPattern(response.value);
    return pattern.isOk()
      ? ok(pattern.value)
      : err({ kind: 'engine-unavailable', detail: 'réponse hors contrat' });
  }

  async exportFile(
    spec: GarmentSpec,
    request: ExportOptionsInput,
  ): Promise<Result<Uint8Array, ManufacturingFailure>> {
    const response = await requestBytes({
      url: `${this.options.baseUrl}/v1/exports`,
      method: 'POST',
      body: { ...request, spec, locale: 'fr' },
      timeoutMs: this.options.timeoutMs,
    });
    return response.isErr() ? err(failureOf(response.error)) : ok(response.value.bytes);
  }
}
