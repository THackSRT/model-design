import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import type { DesignVersioned } from '@atelier/contracts-ts';
import { contractValidator, createLogger, createOutboxRelay } from '@atelier/service-kit';
import {
  connectNats,
  deleteStreamEvent,
  describeStream,
  ensureStream,
  lastStreamEvent,
  type NatsConnection,
} from '@atelier/service-kit/nats';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectEventBus, DESIGNS_STREAM } from '../../src/adapters/messaging/nats-event-bus.js';
import { runMigrations } from '../../src/adapters/persistence/postgres/migrate.js';
import { outbox } from '../../src/adapters/persistence/postgres/schema.js';
import { PostgresOutboxStore } from '../../src/adapters/persistence/postgres/postgres-outbox-store.js';
import { clock } from '../builders.js';

// NATS réel (pnpm dev:infra), hors de `pnpm check`. Le flux DESIGNS est celui du service.
const url = process.env['NATS_URL'] ?? 'nats://localhost:4222';
const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const isDesignVersioned = contractValidator<DesignVersioned>('designVersioned');
const logger = createLogger({}, () => undefined);

describe('flux DESIGNS et relais (NATS réel)', () => {
  let nc: NatsConnection;
  let storedSeq: number | undefined;

  beforeAll(async () => {
    nc = await connectNats(url, 'designs-integration-test');
  });
  afterAll(async () => {
    // Le message d'essai ne doit pas rester dans le flux partagé.
    if (storedSeq !== undefined) await deleteStreamEvent(nc, DESIGNS_STREAM.name, storedSeq);
    await nc.drain();
  });

  it('déclare le flux de façon idempotente', async () => {
    await ensureStream(nc, DESIGNS_STREAM);
    await ensureStream(nc, DESIGNS_STREAM);
    expect(await describeStream(nc, DESIGNS_STREAM.name)).toEqual({
      subjects: ['design.>'],
      storage: 'file',
    });
  });

  it('publie sur le flux DESIGNS un événement de l’outbox, puis le marque publié', async () => {
    const eventId = randomUUID();
    const data: DesignVersioned = {
      designId: randomUUID(),
      versionNumber: 1,
      organizationId: randomUUID(),
      fingerprint: 'a'.repeat(64),
      engineVersion: '0.0.0-test',
    };
    expect(isDesignVersioned(data).isOk()).toBe(true);
    const db = drizzle(new PGlite());
    await runMigrations(db, MIGRATIONS);
    await db.insert(outbox).values({
      id: eventId,
      type: 'design.versioned',
      subject: data.designId,
      data,
      createdAt: new Date(),
    });
    const bus = await connectEventBus(url, { signal: new AbortController().signal, logger });
    const store = new PostgresOutboxStore(db);
    const relay = createOutboxRelay({
      store,
      publisher: bus.publisher,
      clock,
      source: '/services/designs',
      batchSize: 10,
      logger,
    });
    try {
      expect(await relay.runOnce()).toBe(1);
    } finally {
      await bus.close();
    }
    expect(await store.fetchUnpublished(10)).toEqual([]);

    const stored = await lastStreamEvent(nc, DESIGNS_STREAM.name, 'design.versioned');
    storedSeq = stored?.seq;
    expect(stored?.msgId).toBe(eventId);
    const event = stored?.data as { id: string; type: string; data: unknown };
    expect(event.id).toBe(eventId);
    expect(event.type).toBe('design.versioned');
    expect(event.data).toEqual(data);
  });
});
