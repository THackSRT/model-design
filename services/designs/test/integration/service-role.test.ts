import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { PostgresDesignRepository } from '../../src/adapters/persistence/postgres/postgres-design-repository.js';
import type { DesignId } from '../../src/domain/design.js';
import { aDesign, clock, ORG, OTHER_ORG, sequentialIds } from '../builders.js';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const GRANTS = readFileSync(`${MIGRATIONS}/0003_service_role_grants.sql`, 'utf8');
const OTHER_DESIGN = '01920000-0000-7000-8000-00000000d002' as DesignId;

const migratedAs = async (createRole: boolean) => {
  const db = drizzle(new PGlite());
  if (createRole) await db.execute(sql`create role designs_app login`);
  await runMigrations(db, MIGRATIONS);
  return db;
};

const rejects = async (db: Awaited<ReturnType<typeof migratedAs>>, statement: string) => {
  const error = await db.execute(sql.raw(statement)).then(
    () => undefined,
    (caught: unknown) => caught as { cause?: { message?: string } },
  );
  expect(error?.cause?.message).toMatch(/permission denied|must be owner/);
};

// Le compte `designs_app` est celui de la pile Docker : les migrations tournent en propriétaire, le service
// se connecte sous ce rôle, qui ne possède rien.
describe('rôle de service designs_app', () => {
  it('lit et écrit sa propre organisation et ne voit rien d’une autre', async () => {
    const db = await migratedAs(true);
    const designs = new PostgresDesignRepository(db, { ids: sequentialIds(), clock });
    await db.execute(sql`set role designs_app`);
    await designs.create(aDesign());
    await designs.create(aDesign({ id: OTHER_DESIGN, organizationId: OTHER_ORG }));
    expect((await designs.byId(ORG, aDesign().id))?.id).toBe(aDesign().id);
    expect(await designs.byId(ORG, OTHER_DESIGN)).toBeUndefined();
    expect(await designs.byId(OTHER_ORG, aDesign().id)).toBeUndefined();
  });

  it('ne peut ni créer, ni modifier, ni supprimer une table, ni effacer des lignes', async () => {
    const db = await migratedAs(true);
    await db.execute(sql`set role designs_app`);
    await rejects(db, 'create table intruder (id int)');
    await rejects(db, 'alter table designs add column hack text');
    await rejects(db, 'drop table designs');
    await rejects(db, 'delete from designs');
    await rejects(db, 'alter table designs disable row level security');
    await rejects(db, 'select * from schema_migrations');
  });

  it('n’est ni superutilisateur ni propriétaire des tables, et ne contourne pas la sécurité par lignes', async () => {
    const db = await migratedAs(true);
    const role = (await db.execute(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = 'designs_app'`,
    )) as unknown as { rows: unknown[] };
    expect(role.rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    const owners = (await db.execute(
      sql`select count(*)::int as n from pg_tables where schemaname = 'public' and tableowner = 'designs_app'`,
    )) as unknown as { rows: { n: number }[] };
    expect(owners.rows[0]?.n).toBe(0);
  });

  it('reçoit les droits d’une table créée plus tard par le propriétaire', async () => {
    const db = await migratedAs(true);
    await db.execute(sql`create table later (id int primary key)`);
    await db.execute(sql`set role designs_app`);
    await db.execute(sql`insert into later values (1)`);
    await rejects(db, 'delete from later');
  });

  it('la migration de droits est rejouable, et sans effet quand le rôle n’existe pas', async () => {
    const db = await migratedAs(true);
    await db.execute(sql.raw(GRANTS));
    await db.execute(sql.raw(GRANTS));
    const bare = await migratedAs(false);
    await bare.execute(sql.raw(GRANTS));
  });

  it('rattrape un rôle créé après les migrations lorsque la migration de droits est rejouée', async () => {
    const db = await migratedAs(false);
    await db.execute(sql`create role designs_app login`);
    await db.execute(sql.raw(GRANTS));
    await db.execute(sql`set role designs_app`);
    expect(
      await new PostgresDesignRepository(db, { ids: sequentialIds(), clock }).byId(
        ORG,
        aDesign().id,
      ),
    ).toBeUndefined();
  });
});
