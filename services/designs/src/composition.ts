import { systemClock, systemIdGenerator } from '@atelier/kernel';
import { loadConfig, type Logger } from '@atelier/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { z } from 'zod';
import type { DesignRepository } from './application/ports/design-repository.js';
import { type DesignsDeps, designsUseCases } from './application/use-cases/index.js';
import { HttpPatterningEngine } from './adapters/engines/http-patterning-engine.js';
import { createHttpApp } from './adapters/http/http-app.js';
import { fixedOrganization } from './adapters/http/organization-context.js';
import { InMemoryDesignRepository } from './adapters/persistence/in-memory/in-memory-design-repository.js';
import { runMigrations } from './adapters/persistence/postgres/migrate.js';
import { PostgresDesignRepository } from './adapters/persistence/postgres/postgres-design-repository.js';
import { nodeHasher } from './adapters/platform/node-hasher.js';

export const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3101),
  DATABASE_URL: z.url().optional(),
  MIGRATE_ON_START: z.stringbool().default(false),
  MIGRATIONS_DIR: z.string().default('migrations'),
  PATTERNING_URL: z.url().default('http://localhost:3201'),
  PATTERNING_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  DEV_ORGANIZATION_ID: z.uuid().default('01920000-0000-7000-8000-000000000001'),
});
export type DesignsConfig = z.infer<typeof configSchema>;

export const readConfig = (): DesignsConfig => loadConfig(configSchema);

async function repository(config: DesignsConfig, logger: Logger): Promise<DesignRepository> {
  if (!config.DATABASE_URL) {
    logger.log('warn', 'in-memory-repository', {
      reason: 'DATABASE_URL absent : données perdues à l’arrêt',
    });
    return new InMemoryDesignRepository();
  }
  const db = drizzle(new pg.Pool({ connectionString: config.DATABASE_URL }));
  if (config.MIGRATE_ON_START) await runMigrations(db, config.MIGRATIONS_DIR);
  return new PostgresDesignRepository(db, { ids: systemIdGenerator, clock: systemClock });
}

/** Racine de composition : relie chaque port à son adaptateur. Aucune logique ici. */
export async function composeDeps(config: DesignsConfig, logger: Logger): Promise<DesignsDeps> {
  return {
    designs: await repository(config, logger),
    patterning: new HttpPatterningEngine({
      baseUrl: config.PATTERNING_URL,
      timeoutMs: config.PATTERNING_TIMEOUT_MS,
    }),
    hasher: nodeHasher,
    ids: systemIdGenerator,
    clock: systemClock,
  };
}

export async function composeApp(
  config: DesignsConfig,
  logger: Logger,
  overrides: Partial<DesignsDeps> = {},
) {
  const deps = { ...(await composeDeps(config, logger)), ...overrides };
  return createHttpApp({
    useCases: designsUseCases(deps),
    organization: fixedOrganization(config.DEV_ORGANIZATION_ID),
    logger,
  });
}
