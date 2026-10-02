import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { inOrganization } from '../../src/adapters/persistence/postgres/organization-scope.js';
import { PostgresDesignRepository } from '../../src/adapters/persistence/postgres/postgres-design-repository.js';
import { PostgresDrapeRepository } from '../../src/adapters/persistence/postgres/postgres-drape-repository.js';
import { addVersion } from '../../src/domain/design-version.js';
import { type DrapeId, normalizeRequest, requestDrape } from '../../src/domain/drape.js';
import type { DesignId } from '../../src/domain/design.js';
import {
  aDesign,
  aSkirt,
  aSpec,
  clock,
  NOW,
  ORG,
  OTHER_ORG,
  sequentialIds,
  someMeasurements,
} from '../builders.js';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const now = new Date(NOW);
const OTHER_DESIGN = '01920000-0000-7000-8000-00000000d002' as DesignId;

// Le service tourne avec un compte non propriétaire des tables : les politiques de sécurité par lignes
// s'appliquent. Ici le rôle `app_user` joue ce compte ; les migrations s'exécutent en propriétaire.
describe('sécurité au niveau des lignes (rôle non propriétaire)', () => {
  const db = drizzle(new PGlite());
  const ids = sequentialIds();
  const designs = new PostgresDesignRepository(db, { ids, clock });
  const drapes = new PostgresDrapeRepository(db, { ids, clock });

  beforeAll(async () => {
    await runMigrations(db, MIGRATIONS);
    await db.execute(sql`create role app_user`);
    await db.execute(
      sql`grant select, insert, update on designs, design_versions, drapes, outbox to app_user`,
    );
    await db.execute(sql`set role app_user`);
  });
  afterAll(async () => {
    await db.execute(sql`reset role`);
  });

  const version = async (design = aDesign()) => {
    const added = addVersion(design, {
      measurements: someMeasurements(),
      garment: aSkirt(),
      spec: aSpec(),
      fingerprint: 'a'.repeat(64),
      now,
    });
    if (added.isErr()) throw new Error(added.error.detail);
    await designs.saveNewVersion(added.value);
    return added.value.version;
  };

  it('chaque lecture rend la ligne de sa propre organisation et rien pour une autre', async () => {
    const other = aDesign({ id: OTHER_DESIGN, organizationId: OTHER_ORG });
    await designs.create(aDesign());
    await designs.create(other);
    const v1 = await version();
    await version(other);

    expect((await designs.byId(ORG, aDesign().id))?.id).toBe(aDesign().id);
    expect((await designs.byId(OTHER_ORG, OTHER_DESIGN))?.id).toBe(OTHER_DESIGN);
    expect(await designs.byId(ORG, OTHER_DESIGN)).toBeUndefined();

    expect((await designs.version(ORG, aDesign().id, 1))?.fingerprint).toBe(v1.fingerprint);
    expect(await designs.version(ORG, OTHER_DESIGN, 1)).toBeUndefined();
    expect((await designs.version(OTHER_ORG, OTHER_DESIGN, 1))?.number).toBe(1);

    expect(await designs.versionSummaries(ORG, aDesign().id, { limit: 10 })).toHaveLength(1);
    expect(await designs.versionSummaries(ORG, OTHER_DESIGN, { limit: 10 })).toEqual([]);
  });

  it('chaque lecture de drapé rend la ligne de sa propre organisation et rien pour une autre', async () => {
    const ownVersion = await designs.version(ORG, aDesign().id, 1);
    if (!ownVersion) throw new Error('version attendue');
    const own = requestDrape({
      id: '01920000-0000-7000-8000-0000000000a1' as DrapeId,
      organizationId: ORG,
      version: ownVersion,
      request: normalizeRequest({ fabric: { preset: 'linen' } }),
      requestFingerprint: 'e'.repeat(64),
      now,
    });
    expect((await drapes.saveRequest(own, now)).created).toBe(true);
    expect((await drapes.byId(ORG, aDesign().id, 1, own.drape.id))?.id).toBe(own.drape.id);
    expect(await drapes.byId(OTHER_ORG, aDesign().id, 1, own.drape.id)).toBeUndefined();
  });

  it('sans organisation fixée, le compte ne voit aucune ligne ; avec l’autre organisation, pas les siennes', async () => {
    const count = async (table: 'designs' | 'design_versions' | 'drapes', org?: string) => {
      const query = sql.raw(`select count(*)::int as n from ${table}`);
      const result = (await (org
        ? inOrganization(db, org, (tx) => tx.execute(query))
        : db.execute(query))) as unknown as { rows: { n: number }[] };
      return result.rows[0]?.n;
    };
    for (const table of ['designs', 'design_versions', 'drapes'] as const) {
      expect(await count(table)).toBe(0);
    }
    expect(await count('designs', ORG)).toBe(1);
    expect(await count('design_versions', OTHER_ORG)).toBe(1);
    expect(await count('drapes', OTHER_ORG)).toBe(0);
  });

  it('l’outbox, sans sécurité par lignes, reste lisible par le relais pour toutes les organisations', async () => {
    const rows = await db.execute(sql`select count(*)::int as n from outbox`);
    expect(rows.rows).toEqual([{ n: 3 }]);
  });
});
