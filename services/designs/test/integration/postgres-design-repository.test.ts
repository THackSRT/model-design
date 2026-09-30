import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { addVersion } from '../../src/domain/design-version.js';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { PostgresDesignRepository } from '../../src/adapters/persistence/postgres/postgres-design-repository.js';
import {
  aDesign,
  aSkirt,
  aSpec,
  clock,
  NOW,
  OTHER_ORG,
  ORG,
  sequentialIds,
  someMeasurements,
} from '../builders.js';

// Vrai PostgreSQL (PGlite, en WebAssembly) : les migrations SQL et les requêtes Drizzle sont exécutées pour de bon.
const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));

describe('dépôt PostgreSQL', () => {
  const db = drizzle(new PGlite());
  const repository = new PostgresDesignRepository(db, { ids: sequentialIds(), clock });

  beforeAll(async () => {
    expect(await runMigrations(db, MIGRATIONS)).toEqual(['0001_init.sql']);
    expect(await runMigrations(db, MIGRATIONS)).toEqual([]);
  });

  it('enregistre une version, met à jour le modèle et remplit l’outbox dans la même transaction', async () => {
    await repository.create(aDesign());
    const added = addVersion(aDesign(), {
      measurements: someMeasurements(),
      garment: aSkirt(),
      spec: aSpec(),
      fingerprint: 'a'.repeat(64),
      now: new Date(NOW),
    });
    if (added.isErr()) throw new Error(added.error.detail);
    await repository.saveNewVersion(added.value);

    expect((await repository.byId(ORG, aDesign().id))?.latestVersionNumber).toBe(1);
    expect((await repository.version(ORG, aDesign().id, 1))?.spec).toEqual(aSpec());
    const outbox = await db.execute(
      sql`select type, subject from outbox where published_at is null`,
    );
    expect(outbox.rows).toEqual([{ type: 'design.versioned', subject: aDesign().id }]);
  });

  it('ne rend rien à une autre organisation', async () => {
    expect(await repository.byId(OTHER_ORG, aDesign().id)).toBeUndefined();
    expect(await repository.version(OTHER_ORG, aDesign().id, 1)).toBeUndefined();
  });
});
