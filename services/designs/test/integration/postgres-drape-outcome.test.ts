import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { PostgresDesignRepository } from '../../src/adapters/persistence/postgres/postgres-design-repository.js';
import { PostgresDrapeRepository } from '../../src/adapters/persistence/postgres/postgres-drape-repository.js';
import { addVersion } from '../../src/domain/design-version.js';
import {
  DRAPE_TIMEOUT_MS,
  type DrapeId,
  type DrapeOutcome,
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
import { completedData } from '../doubles/drape-events.js';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const now = new Date(NOW);
const completedOutcome = (): DrapeOutcome => {
  const { modelKey, ease, maxStrainPercent, fabricEstimated } = completedData({
    drapeId: 'x',
    designId: 'y',
  }).result;
  return { kind: 'completed', result: { modelKey, ease, maxStrainPercent, fabricEstimated } };
};

describe('résultat du drapé dans PostgreSQL', () => {
  const db = drizzle(new PGlite());
  const ids = sequentialIds();
  const designs = new PostgresDesignRepository(db, { ids, clock });
  const repository = new PostgresDrapeRepository(db, { ids, clock });
  const designId = aDesign().id;
  let version: Parameters<typeof requestDrape>[0]['version'];
  let n = 0;
  const newDrape = async () => {
    const change = requestDrape({
      id: `01920000-0000-7000-8000-0000000e${String(++n).padStart(4, '0')}` as DrapeId,
      organizationId: ORG,
      version,
      request: normalizeRequest({ fabric: { preset: 'bazin' } }),
      requestFingerprint: String(n).padStart(64, 'c'),
      now,
    });
    await repository.saveRequest(change, now);
    return { organizationId: ORG, designId, versionNumber: 1, drapeId: change.drape.id };
  };

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

  it('drape.completed : enregistre le résultat, relu tel quel', async () => {
    const at = await newDrape();
    const done = new Date(now.getTime() + 5000);
    expect(await repository.recordOutcome(at, completedOutcome(), done)).toBe('applied');
    expect(await repository.byId(ORG, designId, 1, at.drapeId)).toMatchObject({
      status: 'completed',
      maxStrainPercent: 4.5,
      fabricEstimated: true,
      ease: { minMm: 2, medianMm: 18, maxMm: 60, tightAreaMm2: 1200 },
      modelKey: completedData({ drapeId: 'x', designId: 'y' }).result.modelKey,
      completedAt: done,
    });
  });

  it('drape.failed : enregistre le type d’erreur', async () => {
    const at = await newDrape();
    const outcome: DrapeOutcome = { kind: 'failed', problemType: '/problems/drape-too-large' };
    expect(await repository.recordOutcome(at, outcome, now)).toBe('applied');
    expect(await repository.byId(ORG, designId, 1, at.drapeId)).toMatchObject({
      status: 'failed',
      problemType: '/problems/drape-too-large',
    });
  });

  it('doublon : le premier résultat gagne', async () => {
    const at = await newDrape();
    await repository.recordOutcome(at, completedOutcome(), now);
    const second = await repository.recordOutcome(
      at,
      { kind: 'failed', problemType: '/problems/drape-internal' },
      new Date(now.getTime() + 1000),
    );
    expect(second).toBe('already-settled');
    expect((await repository.byId(ORG, designId, 1, at.drapeId))?.status).toBe('completed');
  });

  it('résultats simultanés : un seul est appliqué', async () => {
    const at = await newDrape();
    const results = await Promise.all([
      repository.recordOutcome(at, completedOutcome(), now),
      repository.recordOutcome(
        at,
        { kind: 'failed', problemType: '/problems/drape-internal' },
        now,
      ),
    ]);
    expect(results.filter((r) => r === 'applied')).toHaveLength(1);
  });

  it('drapé inconnu, autre organisation ou autre version : unknown, rien n’est écrit', async () => {
    const at = await newDrape();
    const unknown = { ...at, drapeId: '01920000-0000-7000-8000-0000000000ee' as DrapeId };
    expect(await repository.recordOutcome(unknown, completedOutcome(), now)).toBe('unknown');
    expect(
      await repository.recordOutcome({ ...at, organizationId: OTHER_ORG }, completedOutcome(), now),
    ).toBe('unknown');
    expect(
      await repository.recordOutcome({ ...at, versionNumber: 2 }, completedOutcome(), now),
    ).toBe('unknown');
    expect((await repository.byId(ORG, designId, 1, at.drapeId))?.status).toBe('pending');
  });

  it('résultat tardif après 10 minutes : accepté tant que rien n’a été écrit', async () => {
    const at = await newDrape();
    const late = new Date(now.getTime() + DRAPE_TIMEOUT_MS + 1000);
    expect(await repository.recordOutcome(at, completedOutcome(), late)).toBe('applied');
    expect((await repository.byId(ORG, designId, 1, at.drapeId))?.status).toBe('completed');
  });
});
