import type { EventPublisher, Logger } from '@atelier/service-kit';
import {
  connectNats,
  ensureStream,
  JetStreamPublisher,
  type NatsConnection,
} from '@atelier/service-kit/nats';

/** Flux des événements de ce service : sujets = `type` des événements (`design.versioned`, …). */
export const DESIGNS_STREAM = { name: 'DESIGNS', subjects: ['design.>'] } as const;

export interface EventBus {
  publisher: EventPublisher;
  /** Vide puis ferme la connexion. */
  close(): Promise<void>;
}

export interface ConnectOptions {
  /** Annule l'attente : la connexion en cours est refermée, l'appel rend une erreur `AbortError`. */
  signal: AbortSignal;
  logger: Logger;
  retryDelayMs?: number;
}

const abortError = (): Error =>
  Object.assign(new Error('Connexion NATS annulée'), { name: 'AbortError' });

/** Nature de l'erreur seulement (nom, code) : jamais son message. */
const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    function done(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });
}

/** Réessaie tant que NATS est injoignable ; la reconnexion après coupure est assurée par le client. */
async function connectWithRetry(url: string, options: ConnectOptions): Promise<NatsConnection> {
  const { signal, logger, retryDelayMs = 2000 } = options;
  while (!signal.aborted) {
    try {
      const connection = await connectNats(url, 'designs');
      if (!signal.aborted) return connection;
      await connection.close();
    } catch (error) {
      logger.log('warn', 'nats.waiting', { errorName: errorName(error), retryInMs: retryDelayMs });
      await sleep(retryDelayMs, signal);
    }
  }
  throw abortError();
}

/** Se connecte à NATS (avec nouvelles tentatives), déclare le flux (idempotent), rend l'éditeur JetStream. */
export async function connectEventBus(url: string, options: ConnectOptions): Promise<EventBus> {
  const connection = await connectWithRetry(url, options);
  try {
    await ensureStream(connection, DESIGNS_STREAM);
  } catch (error) {
    await connection.close();
    throw error;
  }
  return {
    publisher: new JetStreamPublisher(connection),
    close: () => connection.drain(),
  };
}
