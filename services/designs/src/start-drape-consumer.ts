import type { Logger } from '@atelier/service-kit';
import type { MessageHandler } from '@atelier/service-kit/nats';
import type { DrapeResultsSubscription } from './adapters/messaging/nats-drape-results.js';
import type { ConnectOptions } from './adapters/messaging/nats-event-bus.js';

export type SubscribeDrapeResults = (
  url: string,
  options: ConnectOptions,
  handler: MessageHandler,
) => Promise<DrapeResultsSubscription>;

const noop = async (): Promise<void> => undefined;

const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

/**
 * Démarre en arrière-plan la réception des résultats du drapé s'il y a un bus (`NATS_URL`). Comme le relais,
 * l'API HTTP ne dépend pas de NATS : bus injoignable, le service démarre et réessaie. Rend l'arrêt, utilisable
 * à tout moment, y compris pendant l'attente de connexion.
 */
export function startDrapeConsumer(
  natsUrl: string | undefined,
  ports: { subscribe: SubscribeDrapeResults; handler: MessageHandler; logger: Logger },
): () => Promise<void> {
  if (!natsUrl) return noop;
  const { subscribe, handler, logger } = ports;
  const abort = new AbortController();
  let stopConsumer = noop;
  void subscribe(natsUrl, { signal: abort.signal, logger }, handler)
    .then(async (subscription) => {
      if (abort.signal.aborted) return subscription.close();
      stopConsumer = () => subscription.close();
      logger.log('info', 'drape-consumer-started', { durable: 'designs-drape' });
    })
    .catch((error: unknown) => {
      if (!abort.signal.aborted)
        logger.log('error', 'drape-consumer-failed', { errorName: errorName(error) });
    });
  return async () => {
    abort.abort();
    await stopConsumer();
  };
}
