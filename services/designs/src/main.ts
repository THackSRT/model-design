import 'reflect-metadata';
import { createLogger } from '@atelier/service-kit';
import { composeService, readConfig, type Service } from './composition.js';

const logger = createLogger({ service: 'designs' });
let service: Service | undefined;

const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

async function stop(): Promise<boolean> {
  try {
    await service?.close();
    return true;
  } catch (error) {
    logger.log('error', 'service-stop-failed', { errorName: errorName(error) });
    return false;
  }
}

try {
  const config = readConfig();
  service = await composeService(config, logger);
  await service.app.listen(config.PORT);
  logger.log('info', 'service-started', { port: config.PORT });
} catch (error) {
  // Nature de l'erreur seulement : le message peut contenir une URL de connexion.
  logger.log('error', 'service-start-failed', { errorName: errorName(error) });
  await stop();
  process.exit(1);
}

// L'arrêt (HTTP, relais, NATS, base) est orchestré ici, pas par les hooks d'arrêt de NestJS.
let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.log('info', 'service-stopping', { signal });
  process.exit((await stop()) ? 0 : 1);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
