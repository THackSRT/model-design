import { systemClock, systemIdGenerator } from '@atelier/kernel';
import type { OutboxStore } from '@atelier/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { DesignRepository } from '../../../application/ports/design-repository.js';
import type { DrapeRepository } from '../../../application/ports/drape-repository.js';
import { runMigrations } from './migrate.js';
import { PostgresDesignRepository } from './postgres-design-repository.js';
import { PostgresDrapeRepository } from './postgres-drape-repository.js';
import { PostgresOutboxStore } from './postgres-outbox-store.js';

export interface PostgresPersistence {
  designs: DesignRepository;
  drapes: DrapeRepository;
  outbox: OutboxStore;
  close(): Promise<void>;
}

/** Ouvre la base : dépôt, outbox et fermeture du pool. */
export async function openPostgres(options: {
  url: string;
  migrate: boolean;
  migrationsDir: string;
}): Promise<PostgresPersistence> {
  const pool = new pg.Pool({ connectionString: options.url });
  const db = drizzle(pool);
  if (options.migrate) await runMigrations(db, options.migrationsDir);
  return {
    designs: new PostgresDesignRepository(db, { ids: systemIdGenerator, clock: systemClock }),
    drapes: new PostgresDrapeRepository(db, { ids: systemIdGenerator, clock: systemClock }),
    outbox: new PostgresOutboxStore(db),
    close: () => pool.end(),
  };
}
