import { loadConfig, type Logger } from '@atelier/service-kit';
import { z } from 'zod';
import { createHttpApp } from './adapters/http/http-app.js';

export const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3100),
});
export type __Name__Config = z.infer<typeof configSchema>;

export const readConfig = (): __Name__Config => loadConfig(configSchema);

/** Racine de composition : relie chaque port à son adaptateur. Aucune logique ici. */
export async function composeApp(config: __Name__Config, logger: Logger) {
  void config;
  return createHttpApp({ logger });
}
