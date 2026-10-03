import { AckPolicy, jetstream, jetstreamManager, type ConsumerMessages } from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/transport-node';
import type { Logger } from '../logger.js';

/** Un message reçu : sujet et octets. L'accusé de réception est géré par le consommateur. */
export interface ConsumedMessage {
  readonly subject: string;
  readonly data: Uint8Array;
}

/**
 * Traite un message. Résolu : le message est acquitté (y compris un message qu'on choisit d'ignorer).
 * Rejeté : il est renvoyé plus tard (`nak`), jusqu'à `maxDeliver` livraisons.
 */
export type MessageHandler = (message: ConsumedMessage) => Promise<void>;

/** Partie d'un message JetStream utilisée ici (remplaçable par une doublure dans les tests). */
export interface AckableMessage extends ConsumedMessage {
  ack(): void;
  nak(delayMs?: number): void;
}

export interface ConsumerDeclaration {
  readonly stream: string;
  /** Nom du consommateur durable : l'état de lecture survit aux redémarrages. */
  readonly durable: string;
  readonly filterSubjects: readonly string[];
  /** Défaut 30 000. */
  readonly ackWaitMs?: number;
  /** Défaut 5 : au-delà, JetStream cesse de renvoyer le message. */
  readonly maxDeliver?: number;
  /** Délai avant renvoi d'un message dont le traitement a échoué. Défaut 5 000. */
  readonly retryDelayMs?: number;
}

export interface RunningConsumer {
  /** Arrête la lecture ; le message en cours de traitement va à son terme. */
  stop(): Promise<void>;
}

const NANOS_PER_MS = 1_000_000;
const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

/**
 * Boucle de traitement : un message à la fois, dans l'ordre. Le contenu des messages n'est jamais journalisé,
 * seulement le sujet et la nature de l'erreur.
 */
export async function processMessages(
  messages: AsyncIterable<AckableMessage>,
  handler: MessageHandler,
  options: { logger: Logger; retryDelayMs: number },
): Promise<void> {
  for await (const message of messages) {
    try {
      await handler({ subject: message.subject, data: message.data });
      message.ack();
    } catch (error) {
      options.logger.log('error', 'consumer.handler-failed', {
        subject: message.subject,
        errorName: errorName(error),
      });
      message.nak(options.retryDelayMs);
    }
  }
}

/**
 * Déclare le consommateur durable (idempotent) puis lit son flux en arrière-plan. Au moins une fois : les
 * traitements doivent être idempotents. Le flux doit exister (voir `ensureStream`).
 */
export async function startJetStreamConsumer(
  connection: NatsConnection,
  declaration: ConsumerDeclaration,
  handler: MessageHandler,
  logger: Logger,
): Promise<RunningConsumer> {
  const jsm = await jetstreamManager(connection);
  await jsm.consumers.add(declaration.stream, {
    durable_name: declaration.durable,
    ack_policy: AckPolicy.Explicit,
    filter_subjects: [...declaration.filterSubjects],
    ack_wait: (declaration.ackWaitMs ?? 30_000) * NANOS_PER_MS,
    max_deliver: declaration.maxDeliver ?? 5,
  });
  const consumer = await jetstream(connection).consumers.get(
    declaration.stream,
    declaration.durable,
  );
  const messages: ConsumerMessages = await consumer.consume({ max_messages: 1 });
  const done = processMessages(messages, handler, {
    logger,
    retryDelayMs: declaration.retryDelayMs ?? 5_000,
  }).catch((error: unknown) => {
    logger.log('error', 'consumer.stopped', { errorName: errorName(error) });
  });
  return {
    stop: async () => {
      await messages.close();
      await done;
    },
  };
}
