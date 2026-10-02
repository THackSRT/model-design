import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { PostgresDesignRepository } from '../../src/adapters/persistence/postgres/postgres-design-repository.js';
import { PostgresDrapeRepository } from '../../src/adapters/persistence/postgres/postgres-drape-repository.js';
import { addVersion } from '../../src/domain/design-version.js';
import {
  DRAPE_TIMEOUT_MS,
  type DrapeId,
  normalizeRequest,
  requestDrape,
} from '../../src/domain/drape.js';
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

describe('dépôt PostgreSQL des drapés', () => {
  const db = drizzle(new PGlite());
  const ids = sequentialIds();
  const designs = new PostgresDesignRepository(db, { ids, clock });
  const repository = new PostgresDrapeRepository(db, { ids, clock });
  let version: Parameters<typeof requestDrape>[0]['version'];
  let n = 0;
  const change = (fingerprint = 'c'.repeat(64)) =>
    requestDrape({
      id: `01920000-0000-7000-8000-0000000d${String(++n).padStart(4, '0')}` as DrapeId,
      organizationId: ORG,
      version,
      request: normalizeRequest({ fabric: { preset: 'bazin' } }),
      requestFingerprint: fingerprint,
      now,
    });

  beforeAll(async () => {
    await runMigrations(db, MIGRATIONS);
    await designs.create(aDesign());
    const added = addVersion(aDesign(), {
      measurements: someMeasurements(),
      garment: aSkirt(),
      spec: aSpec(),
      fingerprint: 'a'.repeat(64),
      now,
    });
    if (added.isErr()) throw new Error(added.error.detail);
    await designs.saveNewVersion(added.value);
    version = added.value.version;
  });

  it('enregistre le drapé et drape.requested dans la même transaction, puis le relit', async () => {
    const first = change();
    const saved = await repository.saveRequest(first, now);
    expect(saved).toMatchObject({ created: true, drape: { status: 'pending' } });
    expect(await repository.byId(ORG, version.designId, 1, first.drape.id)).toEqual(first.drape);
    const outbox = await db.execute(
      sql`select type, subject, data->>'quality' as quality from outbox where type = 'drape.requested'`,
    );
    expect(outbox.rows).toEqual([
      { type: 'drape.requested', subject: first.drape.id, quality: 'standard' },
    ]);
  });

  it('rend le drapé existant pour la même empreinte, sans nouvelle ligne ni événement', async () => {
    const again = await repository.saveRequest(change(), now);
    expect(again.created).toBe(false);
    const rows = await db.execute(sql`select count(*)::int as n from drapes`);
    expect(rows.rows).toEqual([{ n: 1 }]);
    const events = await db.execute(
      sql`select count(*)::int as n from outbox where type = 'drape.requested'`,
    );
    expect(events.rows).toEqual([{ n: 1 }]);
  });

  it('refait un drapé quand le précédent est expiré ou échoué', async () => {
    const later = new Date(now.getTime() + DRAPE_TIMEOUT_MS);
    const expired = await repository.saveRequest(change(), later);
    expect(expired.created).toBe(true);
    await db.execute(sql`update drapes set status = 'failed' where id = ${expired.drape.id}`);
    const afterFailure = await repository.saveRequest(change(), later);
    expect(afterFailure.created).toBe(true);
  });

  it('isole les organisations : un drapé d’une autre organisation est introuvable', async () => {
    const own = await repository.saveRequest(change('d'.repeat(64)), now);
    expect(await repository.byId(OTHER_ORG, version.designId, 1, own.drape.id)).toBeUndefined();
    expect(await repository.byId(ORG, version.designId, 2, own.drape.id)).toBeUndefined();
  });

  it('applique la sécurité par lignes : sans contexte d’organisation, aucune ligne visible', async () => {
    await db.execute(sql`create role drape_reader`);
    await db.execute(sql`grant select on drapes to drape_reader`);
    await db.execute(sql`set role drape_reader`);
    try {
      const rows = await db.execute(sql`select id from drapes`);
      expect(rows.rows).toEqual([]);
    } finally {
      await db.execute(sql`reset role`);
    }
  });
});
