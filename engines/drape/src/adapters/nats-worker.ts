import { AckPolicy, jetstream, jetstreamManager, type ConsumerMessages } from '@nats-io/jetstream';
import { connect, type NatsConnection } from '@nats-io/transport-node';
import { processMessages } from './consumer-loop.js';
import type { ResultPublisher } from './handler.js';
import { createTaskHandler } from './handler.js';
import { errorName, type Logger } from './logger.js';
import type { ResultMessage } from './messages.js';
import type { WorkerConfig } from './config.js';
import { S3Store } from './s3-store.js';
import { DRAPE_CONSUMER, DRAPE_JOBS_STREAM, DRAPE_STREAM, ensureStream } from './streams.js';
import { ThreadRunner, type DrapeRunner } from './thread-runner.js';

export interface RunningWorker {
  /** Arrête la lecture, laisse `graceMs` au calcul en cours, puis l'interrompt (le message sera renvoyé). */
  stop(graceMs?: number): Promise<void>;
}

const NANOS_PER_MS = 1_000_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

/** Réessaie tant que NATS est injoignable ; la reconnexion après coupure est assurée par le client. */
async function connectWithRetry(
  url: string,
  logger: Logger,
  signal: AbortSignal,
): Promise<NatsConnection> {
  while (!signal.aborted) {
    try {
      return await connect({ servers: url, name: 'drape', maxReconnectAttempts: -1 });
    } catch (error) {
      logger.log('warn', 'nats.waiting', { errorName: errorName(error), retryInMs: 2000 });
      await sleep(2000, signal);
    }
  }
  throw Object.assign(new Error('Connexion NATS annulée'), { name: 'AbortError' });
}

function publisherOf(connection: NatsConnection): ResultPublisher {
  const js = jetstream(connection);
  return {
    async publish(message: ResultMessage): Promise<void> {
      await js.publish(message.subject, message.body, { msgID: message.msgId });
    },
  };
}

async function startConsumer(
  connection: NatsConnection,
  handler: ReturnType<typeof createTaskHandler>,
  logger: Logger,
): Promise<{ messages: ConsumerMessages; done: Promise<void> }> {
  const jsm = await jetstreamManager(connection);
  await jsm.consumers.add(DRAPE_CONSUMER.stream, {
    durable_name: DRAPE_CONSUMER.durable,
    ack_policy: AckPolicy.Explicit,
    filter_subjects: [...DRAPE_CONSUMER.filterSubjects],
    ack_wait: DRAPE_CONSUMER.ackWaitMs * NANOS_PER_MS,
    max_deliver: DRAPE_CONSUMER.maxDeliver,
  });
  const consumer = await jetstream(connection).consumers.get(
    DRAPE_CONSUMER.stream,
    DRAPE_CONSUMER.durable,
  );
  const messages = await consumer.consume({ max_messages: 1 });
  const done = processMessages(messages, handler, {
    logger,
    retryDelayMs: DRAPE_CONSUMER.retryDelayMs,
  }).catch((error: unknown) => {
    logger.log('error', 'consumer.stopped', { errorName: errorName(error) });
  });
  return { messages, done };
}

/** Attend la fin du message en cours ; passé le délai de grâce, interrompt le calcul (le message sera renvoyé). */
async function finishOrInterrupt(
  done: Promise<void>,
  runner: DrapeRunner,
  graceMs: number,
): Promise<void> {
  const timer = setTimeout(() => {
    void runner.terminate();
  }, graceMs);
  try {
    await done;
  } finally {
    clearTimeout(timer);
  }
}

/** Connecte NATS (nouvelles tentatives), déclare flux et consommateur, puis traite les tâches une à une. */
export async function startNatsWorker(
  config: WorkerConfig,
  logger: Logger,
  runner: DrapeRunner = new ThreadRunner(),
): Promise<RunningWorker> {
  const abort = new AbortController();
  const connection = await connectWithRetry(config.natsUrl, logger, abort.signal);
  try {
    await ensureStream(connection, DRAPE_JOBS_STREAM);
    await ensureStream(connection, DRAPE_STREAM);
    const handler = createTaskHandler({
      store: new S3Store(config.s3),
      publisher: publisherOf(connection),
      runner,
      logger,
      now: () => new Date(),
      heartbeatMs: Math.floor(DRAPE_CONSUMER.ackWaitMs / 3),
    });
    const { messages, done } = await startConsumer(connection, handler, logger);
    logger.log('info', 'worker.started', { consumer: DRAPE_CONSUMER.durable });
    return {
      stop: async (graceMs = 25_000) => {
        abort.abort();
        await messages.close();
        await finishOrInterrupt(done, runner, graceMs);
        await connection.drain();
      },
    };
  } catch (error) {
    await connection.close();
    throw error;
  }
}
