import { jetstreamManager } from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/transport-node';

export interface StreamSummary {
  readonly subjects: readonly string[];
  readonly storage: string;
}

export interface StoredEvent {
  readonly seq: number;
  readonly subject: string;
  readonly data: unknown;
  /** Valeur de l'en-tête `Nats-Msg-Id`. */
  readonly msgId: string | null;
}

/** Aides d'inspection, pour les tests d'intégration des services (NATS réel). */
export async function describeStream(
  connection: NatsConnection,
  name: string,
): Promise<StreamSummary> {
  const { config } = await (await jetstreamManager(connection)).streams.info(name);
  return { subjects: config.subjects ?? [], storage: config.storage };
}

/** Dernier message du flux pour un sujet, ou `undefined`. */
export async function lastStreamEvent(
  connection: NatsConnection,
  stream: string,
  subject: string,
): Promise<StoredEvent | undefined> {
  const jsm = await jetstreamManager(connection);
  const message = await jsm.streams.getMessage(stream, { last_by_subj: subject });
  if (!message) return undefined;
  return {
    seq: message.seq,
    subject: message.subject,
    data: message.json(),
    msgId: message.header.get('Nats-Msg-Id') || null,
  };
}

export async function deleteStreamEvent(
  connection: NatsConnection,
  stream: string,
  seq: number,
): Promise<void> {
  await (await jetstreamManager(connection)).streams.deleteMessage(stream, seq);
}
