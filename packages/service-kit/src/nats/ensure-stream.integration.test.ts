import { jetstreamManager, StorageType } from '@nats-io/jetstream';
import { connect, type NatsConnection } from '@nats-io/transport-node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureStream } from './ensure-stream.js';

const url = process.env['NATS_URL'] ?? 'nats://localhost:4222';
const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
const name = `TEST_ENSURE_${suffix}`;

describe('ensureStream (NATS réel)', () => {
  let nc: NatsConnection;

  beforeAll(async () => {
    nc = await connect({ servers: url });
  });

  afterAll(async () => {
    const jsm = await jetstreamManager(nc);
    await jsm.streams.delete(name).catch(() => false);
    await nc.drain();
  });

  it('crée le flux puis accepte un second appel identique', async () => {
    await ensureStream(nc, { name, subjects: [`ens${suffix}.>`] });
    await ensureStream(nc, { name, subjects: [`ens${suffix}.>`] });
    const info = await (await jetstreamManager(nc)).streams.info(name);
    expect(info.config.subjects).toEqual([`ens${suffix}.>`]);
    expect(info.config.storage).toBe(StorageType.File);
  });

  it('aligne les sujets d’un flux existant', async () => {
    await ensureStream(nc, { name, subjects: [`ens${suffix}.>`, `ens2${suffix}.>`] });
    const info = await (await jetstreamManager(nc)).streams.info(name);
    expect(info.config.subjects).toEqual([`ens${suffix}.>`, `ens2${suffix}.>`]);
  });
});
