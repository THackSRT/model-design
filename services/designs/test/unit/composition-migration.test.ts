import 'reflect-metadata';
import { createLogger } from '@atelier/service-kit';
import { describe, expect, it, vi } from 'vitest';
import { openPostgres } from '../../src/adapters/persistence/postgres/postgres-persistence.js';
import { composeService, configSchema } from '../../src/composition.js';

const connections = vi.hoisted(() => ({ urls: [] as string[], migratedWith: [] as string[] }));

vi.mock('pg', () => {
  class Pool {
    constructor(options: { connectionString: string }) {
      connections.urls.push(options.connectionString);
    }
    end = async (): Promise<void> => undefined;
  }
  return { default: { Pool } };
});
vi.mock('../../src/adapters/persistence/postgres/migrate.js', () => ({
  runMigrations: async (): Promise<string[]> => {
    connections.migratedWith.push(connections.urls.at(-1) ?? '');
    return [];
  },
}));

const logger = createLogger({}, () => undefined);

describe('composition : connexions à la base', () => {
  it('accepte DATABASE_URL (service) et MIGRATION_DATABASE_URL (propriétaire) distinctes', () => {
    const config = configSchema.parse({
      DATABASE_URL: 'postgres://designs_app:x@db:5432/designs',
      MIGRATION_DATABASE_URL: 'postgres://owner:y@db:5432/designs',
      MIGRATE_ON_START: 'true',
    });
    expect(config.DATABASE_URL).toContain('designs_app');
    expect(config.MIGRATION_DATABASE_URL).toContain('owner');
  });

  it('refuse de démarrer avec MIGRATE_ON_START sans MIGRATION_DATABASE_URL', async () => {
    const config = configSchema.parse({
      DATABASE_URL: 'postgres://designs_app:x@db:5432/designs',
      MIGRATE_ON_START: 'true',
    });
    await expect(composeService(config, logger)).rejects.toThrow(/MIGRATION_DATABASE_URL/);
  });

  it('migre par MIGRATION_DATABASE_URL et sert par DATABASE_URL', async () => {
    connections.urls.length = 0;
    connections.migratedWith.length = 0;
    const service = 'postgres://designs_app:x@db:5432/designs';
    const owner = 'postgres://owner:y@db:5432/designs';
    const persistence = await openPostgres({
      url: service,
      migrationUrl: owner,
      migrationsDir: 'm',
    });
    expect(connections.migratedWith).toEqual([owner]);
    expect(connections.urls).toEqual([owner, service]);
    await persistence.close();
  });
});
