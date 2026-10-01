import { systemClock, systemIdGenerator } from '@atelier/kernel';
import { loadConfig, type Logger, type OutboxStore } from '@atelier/service-kit';
import { z } from 'zod';
import type { DesignRepository } from './application/ports/design-repository.js';
import { type DesignsDeps, designsUseCases } from './application/use-cases/index.js';
import { HttpManufacturingEngine } from './adapters/engines/http-manufacturing-engine.js';
import { HttpPatterningEngine } from './adapters/engines/http-patterning-engine.js';
import { createHttpApp } from './adapters/http/http-app.js';
import { fixedOrganization } from './adapters/http/organization-context.js';
import { connectEventBus } from './adapters/messaging/nats-event-bus.js';
import { InMemoryDesignRepository } from './adapters/persistence/in-memory/in-memory-design-repository.js';
import { openPostgres } from './adapters/persistence/postgres/postgres-persistence.js';
import { nodeHasher } from './adapters/platform/node-hasher.js';
import { type ConnectBus, startRelay } from './start-relay.js';

export const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3101),
  DATABASE_URL: z.url().optional(),
  MIGRATE_ON_START: z.stringbool().default(false),
  MIGRATIONS_DIR: z.string().default('migrations'),
  PATTERNING_URL: z.url().default('http://localhost:3201'),
  PATTERNING_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  MANUFACTURING_URL: z.url().default('http://localhost:3202'),
  MANUFACTURING_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  DEV_ORGANIZATION_ID: z.uuid().default('01920000-0000-7000-8000-000000000001'),
  // Absente : pas de relais de l'outbox (le service tourne sans bus).
  NATS_URL: z.url().optional(),
  OUTBOX_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(100),
});
export type DesignsConfig = z.infer<typeof configSchema>;

export const readConfig = (): DesignsConfig => loadConfig(configSchema);

/** Ports remplaçables (tests) : dépendances des cas d'usage, outbox, connexion au bus. */
export interface ComposeOptions {
  deps?: Partial<DesignsDeps>;
  outbox?: OutboxStore;
  connectBus?: ConnectBus;
}

interface Persistence {
  designs: DesignRepository;
  outbox?: OutboxStore;
  close(): Promise<void>;
}

async function persistence(config: DesignsConfig, logger: Logger): Promise<Persistence> {
  if (!config.DATABASE_URL) {
    logger.log('warn', 'in-memory-repository', {
      reason: 'DATABASE_URL absent : données perdues à l’arrêt',
    });
    return { designs: new InMemoryDesignRepository(), close: async () => undefined };
  }
  return openPostgres({
    url: config.DATABASE_URL,
    migrate: config.MIGRATE_ON_START,
    migrationsDir: config.MIGRATIONS_DIR,
  });
}

/** Racine de composition : relie chaque port à son adaptateur. Aucune logique ici. */
export function composeDeps(designs: DesignRepository, config: DesignsConfig): DesignsDeps {
  return {
    designs,
    patterning: new HttpPatterningEngine({
      baseUrl: config.PATTERNING_URL,
      timeoutMs: config.PATTERNING_TIMEOUT_MS,
    }),
    manufacturing: new HttpManufacturingEngine({
      baseUrl: config.MANUFACTURING_URL,
      timeoutMs: config.MANUFACTURING_TIMEOUT_MS,
    }),
    hasher: nodeHasher,
    ids: systemIdGenerator,
    clock: systemClock,
  };
}

export interface Service {
  app: Awaited<ReturnType<typeof createHttpApp>>;
  /** Arrêt propre : HTTP, relais (lot en cours), vidage de la connexion NATS, puis fermeture de la base. */
  close(): Promise<void>;
}

export async function composeService(
  config: DesignsConfig,
  logger: Logger,
  options: ComposeOptions = {},
): Promise<Service> {
  const store = await persistence(config, logger);
  try {
    const deps = { ...composeDeps(store.designs, config), ...options.deps };
    const app = await createHttpApp({
      useCases: designsUseCases(deps),
      organization: fixedOrganization(config.DEV_ORGANIZATION_ID),
      logger,
    });
    const stopRelay = startRelay(config, {
      store: options.outbox ?? store.outbox,
      connectBus: options.connectBus ?? connectEventBus,
      logger,
    });
    return {
      app,
      close: async () => {
        await app.close();
        await stopRelay();
        await store.close();
      },
    };
  } catch (error) {
    await store.close();
    throw error;
  }
}

export async function composeApp(
  config: DesignsConfig,
  logger: Logger,
  overrides: Partial<DesignsDeps> = {},
) {
  return (await composeService(config, logger, { deps: overrides })).app;
}
