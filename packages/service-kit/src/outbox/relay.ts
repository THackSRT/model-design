import type { Clock } from '@atelier/kernel';
import { toCloudEvent } from '../events.js';
import type { Logger } from '../logger.js';
import type { EventPublisher, OutboxRow, OutboxStore } from './ports.js';

export interface OutboxRelayOptions {
  store: OutboxStore;
  publisher: EventPublisher;
  clock: Clock;
  /** Service éditeur, ex. `/services/designs`. */
  source: string;
  batchSize: number;
  logger: Logger;
}

export interface OutboxRelay {
  /** Publie un lot ; rend le nombre d'événements publiés. S'arrête au premier échec du lot. */
  runOnce(): Promise<number>;
  start(intervalMs: number): void;
  /** Arrête la boucle et attend le lot en cours. */
  stop(): Promise<void>;
}

/** Nature de l'erreur seulement (nom, code NATS) : jamais son message ni des données. */
function errorFields(error: unknown): { errorName?: string; errorCode?: string | number } {
  if (typeof error !== 'object' || error === null) return {};
  const { name, code, api_error: api } = error as Record<string, unknown>;
  const raw = code ?? (api as { code?: unknown } | undefined)?.code;
  return {
    errorName: typeof name === 'string' ? name : undefined,
    errorCode: typeof raw === 'string' || typeof raw === 'number' ? raw : undefined,
  };
}

/** Publie les lignes dans l'ordre ; rend les ids publiés, s'arrête au premier échec. */
async function publishInOrder(
  rows: readonly OutboxRow[],
  options: OutboxRelayOptions,
): Promise<string[]> {
  const done: string[] = [];
  try {
    for (const row of rows) {
      const time = row.createdAt;
      await options.publisher.publish(
        toCloudEvent(row, { id: row.id, source: options.source, time }),
      );
      done.push(row.id);
    }
  } catch (error) {
    const failed = rows[done.length];
    options.logger.log('error', 'outbox.publish_failed', {
      id: failed?.id,
      type: failed?.type,
      ...errorFields(error),
    });
  }
  return done;
}

/** Délai avant le lot suivant : aucun si le lot était plein, sinon l'intervalle (aussi après une erreur). */
function nextDelay(
  run: () => Promise<number>,
  options: OutboxRelayOptions,
  intervalMs: number,
): Promise<number> {
  return run()
    .then((count) => (count >= options.batchSize ? 0 : intervalMs))
    .catch(() => {
      options.logger.log('error', 'outbox.relay_failed');
      return intervalMs;
    });
}

/** Relais « au moins une fois » : lit l'outbox, publie dans l'ordre, marque publié après l'accusé du bus. */
export function createOutboxRelay(options: OutboxRelayOptions): OutboxRelay {
  const { store, clock, batchSize, logger } = options;
  let timer: NodeJS.Timeout | undefined;
  let generation = 0;
  let running = false;
  let inFlight: Promise<unknown> = Promise.resolve();

  async function runOnce(): Promise<number> {
    const rows = await store.fetchUnpublished(batchSize);
    const done = await publishInOrder(rows, options);
    if (done.length === 0) return 0;
    await store.markPublished(done, clock.now());
    logger.log('info', 'outbox.published', { count: done.length });
    return done.length;
  }

  /** Une boucle est propre à sa génération : après `stop()`, plus rien ne se replanifie. */
  function schedule(gen: number, delayMs: number, intervalMs: number): void {
    if (gen !== generation) return;
    timer = setTimeout(() => {
      timer = undefined;
      inFlight = nextDelay(runOnce, options, intervalMs).then((next) =>
        schedule(gen, next, intervalMs),
      );
    }, delayMs);
  }

  return {
    runOnce,
    start(intervalMs) {
      if (running) return;
      running = true;
      generation += 1;
      schedule(generation, intervalMs, intervalMs);
    },
    async stop() {
      running = false;
      generation += 1;
      if (timer) clearTimeout(timer);
      timer = undefined;
      await inFlight;
    },
  };
}
