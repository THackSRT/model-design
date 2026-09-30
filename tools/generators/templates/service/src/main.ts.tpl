import 'reflect-metadata';
import { createLogger } from '@atelier/service-kit';
import { composeApp, readConfig } from './composition.js';

const logger = createLogger({ service: '__name__' });
const config = readConfig();
const app = await composeApp(config, logger);
await app.listen(config.PORT);
logger.log('info', 'service-started', { port: config.PORT });
