import { problem, type Problem } from '@atelier/service-kit';
import { ProblemException } from '@atelier/service-kit/nest';

const STATUS: Record<string, number> = {
  'design-not-found': 404,
  'version-not-found': 404,
  'invalid-name': 400,
  'garment-type-mismatch': 422,
  'pattern-impossible': 422,
  'engine-unavailable': 502,
};

/** Types de moteur déjà filtrés par la liste blanche de l'adaptateur, relayés en 422. */
const RELAYED_KINDS = new Set(['manufacturing-problem', 'patterning-problem']);

/** Traduit une erreur prévue du métier en réponse RFC 9457. */
export function failWith(error: { kind: string; detail?: string; type?: string } | Problem): never {
  if ('status' in error) throw new ProblemException(error);
  if (RELAYED_KINDS.has(error.kind) && error.type) {
    throw new ProblemException(problem(error.type, 422, error.detail));
  }
  throw new ProblemException(problem(error.kind, STATUS[error.kind] ?? 500, error.detail));
}
