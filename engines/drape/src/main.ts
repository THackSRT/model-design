import { createApp } from './adapters/bootstrap.js';
import { ConfigError } from './adapters/config.js';
import { consoleLogger as logger } from './adapters/logger.js';
import { startNatsWorker } from './adapters/nats-worker.js';

const port = Number(process.env['PORT'] ?? 8000);

try {
  const app = createApp(process.env, logger, startNatsWorker);
  app.server.listen(port, '0.0.0.0', () => {
    logger.log('info', 'drape listening', { port });
  });
  // Arrêt propre : le calcul en cours se termine (délai de grâce), sinon son message est rendu à JetStream.
  const shutdown = (): void => {
    void (async () => {
      app.server.close();
      try {
        await (await app.worker)?.stop();
      } finally {
        process.exit(0);
      }
    })();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  app.worker?.catch(() => process.exit(1));
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  // Le message nomme la variable en cause, jamais sa valeur.
  logger.log('error', 'config.invalid', { reason: error.message });
  process.exit(1);
}
