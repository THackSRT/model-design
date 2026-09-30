import { systemClock } from '@atelier/kernel';
import { createOutboxRelay, type Logger, type OutboxStore } from '@atelier/service-kit';
import type { ConnectOptions, EventBus } from './adapters/messaging/nats-event-bus.js';

export type ConnectBus = (url: string, options: ConnectOptions) => Promise<EventBus>;

export interface RelayConfig {
  NATS_URL?: string | undefined;
  OUTBOX_INTERVAL_MS: number;
  OUTBOX_BATCH_SIZE: number;
}

const noop = async (): Promise<void> => undefined;

const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

/**
 * Démarre en arrière-plan le relais de l'outbox s'il y a un bus (`NATS_URL`) et une outbox : l'API HTTP ne
 * dépend pas de NATS, le service démarre même si le bus est injoignable (nouvelles tentatives, journalisées).
 * Rend l'arrêt, utilisable à tout moment, y compris pendant l'attente de connexion.
 */
export function startRelay(
  config: RelayConfig,
  ports: { store: OutboxStore | undefined; connectBus: ConnectBus; logger: Logger },
): () => Promise<void> {
  const { store, connectBus, logger } = ports;
  if (!config.NATS_URL) return noop;
  if (!store) {
    logger.log('warn', 'outbox-relay-disabled', { reason: 'DATABASE_URL absent : pas d’outbox' });
    return noop;
  }
  const abort = new AbortController();
  let stopRelay = noop;
  void connectBus(config.NATS_URL, { signal: abort.signal, logger })
    .then(async (bus) => {
      if (abort.signal.aborted) return bus.close();
      const relay = createOutboxRelay({
        store,
        publisher: bus.publisher,
        clock: systemClock,
        source: '/services/designs',
        batchSize: config.OUTBOX_BATCH_SIZE,
        logger,
      });
      relay.start(config.OUTBOX_INTERVAL_MS);
      stopRelay = async () => {
        await relay.stop();
        await bus.close();
      };
      logger.log('info', 'outbox-relay-started', { intervalMs: config.OUTBOX_INTERVAL_MS });
    })
    .catch((error: unknown) => {
      if (!abort.signal.aborted)
        logger.log('error', 'outbox-relay-failed', { errorName: errorName(error) });
    });
  return async () => {
    abort.abort();
    await stopRelay();
  };
}
