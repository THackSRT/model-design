import type { Server } from 'node:http';
import { createHealthServer } from '../server.js';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { errorName, type Logger } from './logger.js';
import type { RunningWorker } from './nats-worker.js';

export interface App {
  server: Server;
  /** Absent sans `NATS_URL` : le moteur ne garde que son serveur de santé. */
  worker?: Promise<RunningWorker>;
}

/** Serveur de santé, plus le travailleur NATS si `NATS_URL` est défini (configuration invalide : lève). */
export function createApp(
  env: Readonly<Record<string, string | undefined>>,
  logger: Logger,
  startWorker: (config: WorkerConfig, logger: Logger) => Promise<RunningWorker>,
): App {
  const config = loadWorkerConfig(env);
  const server = createHealthServer();
  if (config === undefined) {
    logger.log('info', 'worker.disabled');
    return { server };
  }
  const worker = startWorker(config, logger);
  worker.catch((error: unknown) => {
    logger.log('error', 'worker.failed', { errorName: errorName(error) });
  });
  return { server, worker };
}
