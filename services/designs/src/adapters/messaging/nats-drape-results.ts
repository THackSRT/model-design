import {
  ensureStream,
  type MessageHandler,
  startJetStreamConsumer,
} from '@atelier/service-kit/nats';
import { type ConnectOptions, connectWithRetry } from './nats-event-bus.js';

/**
 * Flux des résultats du moteur de drapé (ADR 0013). Il appartient au moteur, qui le déclare ; designs le déclare
 * aussi (idempotent, mêmes sujets) pour démarrer dans n'importe quel ordre.
 */
export const DRAPE_STREAM = {
  name: 'DRAPE',
  subjects: ['drape.completed', 'drape.failed'],
} as const;

/** Consommateur durable de designs : un message à la fois, 5 livraisons au plus, renvoi après 5 s. */
export const DRAPE_CONSUMER = {
  stream: DRAPE_STREAM.name,
  durable: 'designs-drape',
  filterSubjects: DRAPE_STREAM.subjects,
  ackWaitMs: 30_000,
  maxDeliver: 5,
  retryDelayMs: 5_000,
} as const;

export interface DrapeResultsSubscription {
  /** Arrête la lecture, puis vide et ferme la connexion. */
  close(): Promise<void>;
}

/** Se connecte (avec nouvelles tentatives), déclare flux et consommateur, puis livre les résultats à `handler`. */
export async function subscribeDrapeResults(
  url: string,
  options: ConnectOptions,
  handler: MessageHandler,
): Promise<DrapeResultsSubscription> {
  const connection = await connectWithRetry(url, options, 'designs-drape');
  try {
    await ensureStream(connection, DRAPE_STREAM);
    const consumer = await startJetStreamConsumer(
      connection,
      DRAPE_CONSUMER,
      handler,
      options.logger,
    );
    return {
      close: async () => {
        await consumer.stop();
        await connection.drain();
      },
    };
  } catch (error) {
    await connection.close();
    throw error;
  }
}
