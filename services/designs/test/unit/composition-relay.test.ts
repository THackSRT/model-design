import 'reflect-metadata';
import type { EventPublisher, OutboxStore } from '@atelier/service-kit';
import { createLogger } from '@atelier/service-kit';
import { describe, expect, it } from 'vitest';
import type { EventBus } from '../../src/adapters/messaging/nats-event-bus.js';
import { composeService, configSchema } from '../../src/composition.js';
import type { ConnectBus } from '../../src/start-relay.js';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fakes() {
  const calls: string[] = [];
  const logs: { event: string }[] = [];
  const logger = createLogger({}, (line) => logs.push(JSON.parse(line) as { event: string }));
  const store: OutboxStore = {
    fetchUnpublished: async () => {
      calls.push('fetch');
      return [];
    },
    markPublished: async () => undefined,
  };
  const publisher: EventPublisher = { publish: async () => undefined };
  const connectBus: ConnectBus = async (url) => {
    calls.push(`connect ${url}`);
    return {
      publisher,
      close: async () => {
        calls.push('bus closed');
      },
    } satisfies EventBus;
  };
  return { calls, logs, logger, store, connectBus };
}

describe('composition : relais de l’outbox', () => {
  it('ne démarre pas de relais sans NATS_URL', async () => {
    const { calls, logger, store, connectBus } = fakes();
    const service = await composeService(configSchema.parse({}), logger, {
      outbox: store,
      connectBus,
    });
    await wait(30);
    await service.close();
    expect(calls).toEqual([]);
  });

  it('démarre le relais avec NATS_URL, puis l’arrête et ferme la connexion à la fermeture', async () => {
    const { calls, logger, store, connectBus } = fakes();
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222', OUTBOX_INTERVAL_MS: '5' });
    const service = await composeService(config, logger, { outbox: store, connectBus });
    await wait(60);
    expect(calls[0]).toBe('connect nats://nats:4222');
    expect(calls).toContain('fetch');

    await service.close();
    expect(calls.at(-1)).toBe('bus closed');
    const fetched = calls.filter((c) => c === 'fetch').length;
    await wait(40);
    expect(calls.filter((c) => c === 'fetch').length).toBe(fetched);
  });

  it('démarre l’API HTTP même si le bus est injoignable, et se ferme sans attendre la connexion', async () => {
    const { calls, logger, store } = fakes();
    let signal: AbortSignal | undefined;
    const neverConnects: ConnectBus = (_url, options) => {
      signal = options.signal;
      return new Promise<EventBus>(() => undefined);
    };
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222' });
    const service = await composeService(config, logger, {
      outbox: store,
      connectBus: neverConnects,
    });
    await service.app.listen(0);
    const response = await fetch(`${await service.app.getUrl()}/v1/designs/unknown`);
    expect(response.status).toBeLessThan(500);

    await service.close();
    expect(signal?.aborted).toBe(true);
    expect(calls).toEqual([]);
  });

  it('journalise l’échec du bus sans rejeter de promesse, et laisse le service fonctionner', async () => {
    const { logs, logger, store } = fakes();
    const failing: ConnectBus = async () => {
      throw new Error('secret://ne-pas-journaliser');
    };
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222' });
    const service = await composeService(config, logger, { outbox: store, connectBus: failing });
    await wait(20);
    await service.close();
    expect(logs.map((l) => l.event)).toContain('outbox-relay-failed');
    expect(JSON.stringify(logs)).not.toContain('secret://');
  });

  it('referme une connexion obtenue après la fermeture du service', async () => {
    const { calls, logger, store } = fakes();
    let release: (bus: EventBus) => void = () => undefined;
    const late: ConnectBus = () => new Promise<EventBus>((resolve) => (release = resolve));
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222', OUTBOX_INTERVAL_MS: '5' });
    const service = await composeService(config, logger, { outbox: store, connectBus: late });
    await service.close();
    release({
      publisher: { publish: async () => undefined },
      close: async () => {
        calls.push('bus closed');
      },
    });
    await wait(30);
    expect(calls).toEqual(['bus closed']);
  });

  it('n’ouvre pas de connexion sans outbox (pas de base)', async () => {
    const { calls, logger, connectBus } = fakes();
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222' });
    const service = await composeService(config, logger, { connectBus });
    await service.close();
    expect(calls).toEqual([]);
  });

  it('refuse un NATS_URL invalide', () => {
    expect(configSchema.safeParse({ NATS_URL: 'pas une url' }).success).toBe(false);
  });
});
