import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { outbox } from '../../src/adapters/persistence/postgres/schema.js';
import { PostgresOutboxStore } from '../../src/adapters/persistence/postgres/postgres-outbox-store.js';
import { OTHER_ORG, ORG } from '../builders.js';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const id = (n: number) => `01920000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const at = (seconds: number) => new Date(Date.UTC(2026, 8, 30, 10, 0, seconds));

describe('outbox PostgreSQL', () => {
  const db = drizzle(new PGlite());
  const store = new PostgresOutboxStore(db);

  beforeAll(async () => {
    await runMigrations(db, MIGRATIONS);
    // Volontairement dans le désordre ; deux lignes partagent la même date (départage par id).
    await db.insert(outbox).values([
      { id: id(3), type: 'design.versioned', subject: 'c', data: { n: 3 }, createdAt: at(2) },
      { id: id(2), type: 'design.versioned', subject: 'b', data: { n: 2 }, createdAt: at(1) },
      { id: id(1), type: 'design.versioned', subject: 'a', data: { n: 1 }, createdAt: at(1) },
      { id: id(4), type: 'design.versioned', subject: 'd', data: { n: 4 }, createdAt: at(3) },
    ]);
  });

  it('rend les lignes non publiées de la plus ancienne à la plus récente, dans la limite demandée', async () => {
    const rows = await store.fetchUnpublished(3);
    expect(rows.map((r) => r.id)).toEqual([id(1), id(2), id(3)]);
    expect(rows[0]).toEqual({
      id: id(1),
      type: 'design.versioned',
      subject: 'a',
      data: { n: 1 },
      createdAt: at(1),
    });
  });

  it('exclut du lot suivant les lignes marquées publiées', async () => {
    await store.markPublished([id(1), id(2)], at(10));
    expect((await store.fetchUnpublished(10)).map((r) => r.id)).toEqual([id(3), id(4)]);
    await store.markPublished([], at(10));
    await store.markPublished([id(3), id(4)], at(11));
    expect(await store.fetchUnpublished(10)).toEqual([]);
  });

  it('lit les événements de toutes les organisations malgré la sécurité par lignes', async () => {
    await db.execute(sql`create role relay_app`);
    await db.execute(sql`grant select, update on outbox to relay_app`);
    await db.execute(sql`grant select on designs to relay_app`);
    await db.insert(outbox).values([
      { id: id(11), type: 'design.versioned', subject: ORG, data: {}, createdAt: at(20) },
      { id: id(12), type: 'design.versioned', subject: OTHER_ORG, data: {}, createdAt: at(21) },
    ]);
    await db.execute(sql`set role relay_app`);
    try {
      // La sécurité par lignes s'applique bien à ce rôle (aucune organisation fixée : rien de visible)...
      const visible = await db.execute(sql`select id from designs`);
      expect(visible.rows).toEqual([]);
      // ... mais pas à l'outbox, que le relais lit en entier.
      expect((await store.fetchUnpublished(10)).map((r) => r.id)).toEqual([id(11), id(12)]);
      await store.markPublished([id(11), id(12)], at(30));
      expect(await store.fetchUnpublished(10)).toEqual([]);
    } finally {
      await db.execute(sql`reset role`);
    }
  });
});
