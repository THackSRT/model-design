import type { CloudEventEnvelope } from '@atelier/contracts-ts';
import { jetstreamManager } from '@nats-io/jetstream';
import { connect, type NatsConnection } from '@nats-io/transport-node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JetStreamPublisher } from './jetstream-publisher.js';

const url = process.env['NATS_URL'] ?? 'nats://localhost:4222';
const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
const streamName = `TEST_RELAY_${suffix}`;
const subject = `it${suffix}.versioned`;

const event: CloudEventEnvelope = {
  specversion: '1.0',
  id: '00000000-0000-4000-8000-000000000001',
  source: '/services/designs',
  type: subject,
  subject: 'design/1',
  time: '2026-01-01T00:00:00.000Z',
  datacontenttype: 'application/json',
  data: { hello: 'monde' },
};

describe('JetStreamPublisher (NATS réel)', () => {
  let nc: NatsConnection;

  beforeAll(async () => {
    nc = await connect({ servers: url });
    const jsm = await jetstreamManager(nc);
    await jsm.streams.add({ name: streamName, subjects: [subject] });
  });

  afterAll(async () => {
    const jsm = await jetstreamManager(nc);
    await jsm.streams.delete(streamName).catch(() => false);
    await nc.drain();
  });

  it('publie sur le bon sujet avec le bon contenu, et déduplique le même id', async () => {
    const publisher = new JetStreamPublisher(nc);
    await publisher.publish(event);
    await publisher.publish(event);
    const jsm = await jetstreamManager(nc);
    const info = await jsm.streams.info(streamName);
    expect(info.state.messages).toBe(1);
    const stored = await jsm.streams.getMessage(streamName, { seq: 1 });
    expect(stored?.subject).toBe(subject);
    expect(stored?.json<CloudEventEnvelope>()).toEqual(event);
    expect(stored?.header.get('Nats-Msg-Id')).toBe(event.id);
  });
});
