import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import type { CloudEventEnvelope } from '@atelier/contracts-ts';
import { createLogger, createOutboxRelay, type EventPublisher } from '@atelier/service-kit';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';
import { designsUseCases } from '../../src/application/use-cases/index.js';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { PostgresDesignRepository } from '../../src/adapters/persistence/postgres/postgres-design-repository.js';
import { PostgresOutboxStore } from '../../src/adapters/persistence/postgres/postgres-outbox-store.js';
import { nodeHasher } from '../../src/adapters/platform/node-hasher.js';
import { aDesign, aSkirt, clock, ORG, sequentialIds, someMeasurements } from '../builders.js';
import { FakeManufacturingEngine } from '../doubles/fake-manufacturing-engine.js';
import { FakePatterningEngine } from '../doubles/fake-patterning-engine.js';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));

describe('de la version de modèle à la publication (sans réseau)', () => {
  it('publie design.versioned puis marque la ligne de l’outbox publiée', async () => {
    const db = drizzle(new PGlite());
    await runMigrations(db, MIGRATIONS);
    const ids = sequentialIds();
    const designs = new PostgresDesignRepository(db, { ids, clock });
    await designs.create(aDesign());
    const created = await designsUseCases({
      designs,
      patterning: new FakePatterningEngine(),
      manufacturing: new FakeManufacturingEngine(),
      hasher: nodeHasher,
      ids,
      clock,
    }).createDesignVersion({
      organizationId: ORG,
      designId: aDesign().id,
      measurements: someMeasurements(),
      garment: aSkirt(),
    });
    expect(created.isOk()).toBe(true);

    const published: CloudEventEnvelope[] = [];
    const publisher: EventPublisher = {
      publish: async (event) => {
        published.push(event);
      },
    };
    const store = new PostgresOutboxStore(db);
    const relay = createOutboxRelay({
      store,
      publisher,
      clock,
      source: '/services/designs',
      batchSize: 10,
      logger: createLogger({}, () => undefined),
    });

    expect(await relay.runOnce()).toBe(1);
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      type: 'design.versioned',
      subject: aDesign().id,
      source: '/services/designs',
    });
    expect(await store.fetchUnpublished(10)).toEqual([]);
    expect(await relay.runOnce()).toBe(0);
  });
});
