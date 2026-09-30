import type { CloudEventEnvelope } from '@atelier/contracts-ts';
import { fixedClock } from '@atelier/kernel';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger.js';
import { contractValidator } from '../validation.js';
import type { EventPublisher, OutboxRow, OutboxStore } from './ports.js';
import { createOutboxRelay } from './relay.js';

const row = (n: number): OutboxRow => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  type: 'design.versioned',
  subject: `design/${n}`,
  data: { n },
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, n)),
});

class MemoryStore implements OutboxStore {
  readonly published = new Map<string, Date>();
  constructor(private readonly rows: OutboxRow[]) {}
  fetchUnpublished(limit: number): Promise<readonly OutboxRow[]> {
    return Promise.resolve(this.rows.filter((r) => !this.published.has(r.id)).slice(0, limit));
  }
  markPublished(ids: readonly string[], at: Date): Promise<void> {
    for (const id of ids) this.published.set(id, at);
    return Promise.resolve();
  }
}

class MemoryPublisher implements EventPublisher {
  readonly sent: CloudEventEnvelope[] = [];
  failOn: string | undefined;
  publish(event: CloudEventEnvelope): Promise<void> {
    if (event.id === this.failOn) return Promise.reject(new Error('bus indisponible'));
    this.sent.push(event);
    return Promise.resolve();
  }
}

function setup(rows: OutboxRow[], batchSize = 10) {
  const store = new MemoryStore(rows);
  const publisher = new MemoryPublisher();
  const lines: string[] = [];
  const relay = createOutboxRelay({
    store,
    publisher,
    clock: fixedClock('2026-02-01T12:00:00.000Z'),
    source: '/services/designs',
    batchSize,
    logger: createLogger({}, (l) => lines.push(l)),
  });
  return { store, publisher, relay, lines };
}

describe('createOutboxRelay', () => {
  afterEach(() => vi.useRealTimers());

  it("publie dans l'ordre et marque publié avec l'heure de l'horloge", async () => {
    const { store, publisher, relay } = setup([row(1), row(2), row(3)]);
    expect(await relay.runOnce()).toBe(3);
    expect(publisher.sent.map((e) => e.id)).toEqual([row(1).id, row(2).id, row(3).id]);
    const times = [...store.published.values()].map((d) => d.toISOString());
    expect(times).toEqual(Array(3).fill('2026-02-01T12:00:00.000Z'));
    expect(await relay.runOnce()).toBe(0);
  });

  it('respecte la taille du lot', async () => {
    const { relay } = setup([row(1), row(2), row(3)], 2);
    expect(await relay.runOnce()).toBe(2);
    expect(await relay.runOnce()).toBe(1);
  });

  it("s'arrête au premier échec puis reprend à cet événement", async () => {
    const { store, publisher, relay, lines } = setup([row(1), row(2), row(3)]);
    publisher.failOn = row(2).id;
    expect(await relay.runOnce()).toBe(1);
    expect([...store.published.keys()]).toEqual([row(1).id]);
    expect(publisher.sent).toHaveLength(1);
    publisher.failOn = undefined;
    expect(await relay.runOnce()).toBe(2);
    expect(publisher.sent.map((e) => e.id)).toEqual([row(1).id, row(2).id, row(3).id]);
    const failure = lines
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .find((l) => l['event'] === 'outbox.publish_failed');
    expect(failure).toMatchObject({ id: row(2).id, type: 'design.versioned' });
    expect(lines.join('')).not.toContain('bus indisponible');
  });

  it("publie un CloudEvent valide dont l'id est celui de la ligne", async () => {
    const { publisher, relay, lines } = setup([row(1)]);
    await relay.runOnce();
    const event = publisher.sent[0];
    expect(contractValidator<CloudEventEnvelope>('cloudEvent')(event).isOk()).toBe(true);
    expect(event).toMatchObject({
      id: row(1).id,
      source: '/services/designs',
      type: 'design.versioned',
      subject: 'design/1',
      time: '2026-01-01T00:00:01.000Z',
      data: { n: 1 },
    });
    expect(lines.join('')).not.toContain('"n":1');
  });

  it("boucle à intervalle régulier puis s'arrête sans minuterie pendante", async () => {
    vi.useFakeTimers();
    const { publisher, relay } = setup([row(1)]);
    relay.start(1000);
    relay.start(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(publisher.sent).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    await relay.stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(publisher.sent).toHaveLength(1);
  });

  it('survit à une erreur du store', async () => {
    vi.useFakeTimers();
    const { store, relay, lines } = setup([row(1)]);
    vi.spyOn(store, 'fetchUnpublished').mockRejectedValueOnce(new Error('db'));
    relay.start(1000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(lines.some((l) => l.includes('outbox.relay_failed'))).toBe(true);
    expect(store.published.size).toBe(1);
    await relay.stop();
  });

  it('stop pendant un lot en cours : rien ne se replanifie', async () => {
    vi.useFakeTimers();
    const { publisher, relay } = setup([row(1)]);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = publisher.publish.bind(publisher);
    publisher.publish = async (event) => {
      await gate;
      return original(event);
    };
    relay.start(1000);
    await vi.advanceTimersByTimeAsync(1000);
    const stopped = relay.stop();
    release();
    await stopped;
    await vi.advanceTimersByTimeAsync(5000);
    expect(vi.getTimerCount()).toBe(0);
    expect(publisher.sent).toHaveLength(1);
  });

  it('start pendant un stop en attente : une seule boucle', async () => {
    vi.useFakeTimers();
    const { store, publisher, relay } = setup([row(1)]);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = publisher.publish.bind(publisher);
    publisher.publish = async (event) => {
      await gate;
      return original(event);
    };
    relay.start(1000);
    await vi.advanceTimersByTimeAsync(1000);
    const stopped = relay.stop();
    relay.start(1000);
    release();
    await stopped;
    await vi.advanceTimersByTimeAsync(10);
    expect(vi.getTimerCount()).toBe(1);
    const spy = vi.spyOn(store, 'fetchUnpublished');
    await vi.advanceTimersByTimeAsync(3000);
    expect(spy).toHaveBeenCalledTimes(3);
    await relay.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("journalise le nom et le code de l'erreur, jamais son message", async () => {
    const { publisher, relay, lines } = setup([row(1)]);
    publisher.publish = () =>
      Promise.reject(Object.assign(new Error('secret métier'), { name: 'NatsError', code: 503 }));
    await relay.runOnce();
    const failure = lines.map((l) => JSON.parse(l) as Record<string, unknown>)[0];
    expect(failure).toMatchObject({ errorName: 'NatsError', errorCode: 503 });
    expect(lines.join('')).not.toContain('secret');
  });

  it('enchaîne tout de suite quand le lot est plein', async () => {
    vi.useFakeTimers();
    const { publisher, relay } = setup([row(1), row(2), row(3), row(4), row(5)], 2);
    relay.start(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);
    expect(publisher.sent).toHaveLength(5);
    await relay.stop();
  });
});
