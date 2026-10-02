import type { CloudEventEnvelope, DrapeCompleted, DrapeFailed } from '@atelier/contracts-ts';
import { contractValidator, type Logger } from '@atelier/service-kit';
import type { MessageHandler } from '@atelier/service-kit/nats';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import type { DrapeId, DrapeOutcome } from '../../domain/drape.js';
import type { RecordDrapeOutcomeInput } from '../../application/use-cases/record-drape-outcome.js';
import type { RecordedOutcome } from '../../application/ports/drape-repository.js';

const isEnvelope = contractValidator<CloudEventEnvelope>('cloudEvent');
const isCompleted = contractValidator<DrapeCompleted>('drapeCompleted');
const isFailed = contractValidator<DrapeFailed>('drapeFailed');

const decoder = new TextDecoder();

type Parsed = Omit<RecordDrapeOutcomeInput, 'outcome'> & { outcome: DrapeOutcome };

const location = (data: DrapeCompleted | DrapeFailed) => ({
  organizationId: data.organizationId as OrganizationId,
  designId: data.designId as DesignId,
  versionNumber: data.versionNumber,
  drapeId: data.drapeId as DrapeId,
});

function parseCompleted(data: unknown): Parsed | undefined {
  const valid = isCompleted(data);
  if (valid.isErr()) return undefined;
  const { result, organizationId } = valid.value;
  // La clé du modèle est sous le préfixe de l'organisation : sinon le résultat est refusé (jamais lu ensuite).
  if (!result.modelKey.startsWith(`drapes/${organizationId}/`)) return undefined;
  const { modelKey, ease, maxStrainPercent, fabricEstimated } = result;
  return {
    ...location(valid.value),
    outcome: { kind: 'completed', result: { modelKey, ease, maxStrainPercent, fabricEstimated } },
  };
}

function parseFailed(data: unknown): Parsed | undefined {
  const valid = isFailed(data);
  if (valid.isErr()) return undefined;
  return {
    ...location(valid.value),
    outcome: { kind: 'failed', problemType: valid.value.type },
  };
}

function parse(bytes: Uint8Array): Parsed | 'ignored' | undefined {
  let json: unknown;
  try {
    json = JSON.parse(decoder.decode(bytes));
  } catch {
    return undefined;
  }
  const envelope = isEnvelope(json);
  if (envelope.isErr()) return undefined;
  if (envelope.value.type === 'drape.completed') return parseCompleted(envelope.value.data);
  if (envelope.value.type === 'drape.failed') return parseFailed(envelope.value.data);
  return 'ignored';
}

/**
 * Traite un message du flux DRAPE. Un message invalide ou d'un autre type est journalisé (sujet seulement, jamais
 * son contenu) puis acquitté : le renvoyer ne le corrigerait pas. Un drapé déjà terminé, inconnu ou d'une autre
 * organisation est acquitté et journalisé (identifiants seulement). Une panne du dépôt fait rejeter le message
 * (il est renvoyé).
 */
export function drapeResultHandler(
  record: (input: RecordDrapeOutcomeInput) => Promise<RecordedOutcome>,
  logger: Logger,
): MessageHandler {
  return async ({ subject, data }) => {
    const parsed = parse(data);
    if (parsed === undefined || parsed === 'ignored') {
      logger.log('warn', 'drape-result.ignored', {
        subject,
        reason: parsed === undefined ? 'invalid' : 'unexpected-type',
      });
      return;
    }
    const recorded = await record(parsed);
    logger.log(recorded === 'applied' ? 'info' : 'warn', `drape-result.${recorded}`, {
      subject,
      drapeId: parsed.drapeId,
    });
  };
}
