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

async function migrateAsOwner(url: string, directory: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await runMigrations(drizzle(pool), directory);
  } finally {
    await pool.end();
  }
}

/** Ouvre la base : dépôt, outbox et fermeture du pool. */
export async function openPostgres(options: {
  url: string;
  /** Connexion du propriétaire des tables, ouverte le temps des migrations seulement. */
  migrationUrl?: string;
  migrationsDir: string;
}): Promise<PostgresPersistence> {
  if (options.migrationUrl) await migrateAsOwner(options.migrationUrl, options.migrationsDir);
  const pool = new pg.Pool({ connectionString: options.url });
  const db = drizzle(pool);
  return {
    designs: new PostgresDesignRepository(db, { ids: systemIdGenerator, clock: systemClock }),
    drapes: new PostgresDrapeRepository(db, { ids: systemIdGenerator, clock: systemClock }),
    outbox: new PostgresOutboxStore(db),
    close: () => pool.end(),
  };
}
