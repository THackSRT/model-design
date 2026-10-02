import 'reflect-metadata';
import { createLogger } from '@atelier/service-kit';
import type { MessageHandler } from '@atelier/service-kit/nats';
import { describe, expect, it } from 'vitest';
import { composeService, configSchema } from '../../src/composition.js';
import type { ConnectBus } from '../../src/start-relay.js';
import type { SubscribeDrapeResults } from '../../src/start-drape-consumer.js';

/** Aucune connexion réseau réelle dans un test unitaire. */
const noBus: ConnectBus = async () => ({
  publisher: { publish: async () => undefined },
  close: async () => undefined,
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fakes() {
  const calls: string[] = [];
  const logs: { event: string }[] = [];
  const logger = createLogger({}, (line) => logs.push(JSON.parse(line) as { event: string }));
  let handler: MessageHandler | undefined;
  const subscribe: SubscribeDrapeResults = async (url, _options, h) => {
    calls.push(`subscribe ${url}`);
    handler = h;
    return { close: async () => void calls.push('closed') };
  };
  return { calls, logs, logger, subscribe, handler: () => handler };
}

describe('composition : réception des résultats du drapé', () => {
  it('ne s’abonne pas sans NATS_URL', async () => {
    const { calls, logger, subscribe } = fakes();
    const service = await composeService(configSchema.parse({}), logger, {
      subscribeDrapeResults: subscribe,
      connectBus: noBus,
    });
    await service.close();
    expect(calls).toEqual([]);
  });

  it('s’abonne avec NATS_URL, route les messages vers le cas d’usage, puis se ferme', async () => {
    const { calls, logs, logger, subscribe, handler } = fakes();
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222' });
    const service = await composeService(config, logger, {
      subscribeDrapeResults: subscribe,
      connectBus: noBus,
    });
    await wait(30);
    expect(calls).toEqual(['subscribe nats://nats:4222']);
    await handler()?.({ subject: 'drape.completed', data: new TextEncoder().encode('{}') });
    expect(logs.map((l) => l.event)).toContain('drape-result.ignored');
    await service.close();
    expect(calls.at(-1)).toBe('closed');
  });

  it('journalise l’échec de l’abonnement sans arrêter le service', async () => {
    const { logs, logger } = fakes();
    const failing: SubscribeDrapeResults = async () => {
      throw new Error('secret://ne-pas-journaliser');
    };
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222' });
    const service = await composeService(config, logger, {
      subscribeDrapeResults: failing,
      connectBus: noBus,
    });
    await wait(20);
    await service.close();
    expect(logs.map((l) => l.event)).toContain('drape-consumer-failed');
    expect(JSON.stringify(logs)).not.toContain('secret://');
  });

  it('referme un abonnement obtenu après la fermeture du service', async () => {
    const { calls, logger } = fakes();
    let release: (value: { close(): Promise<void> }) => void = () => undefined;
    const late: SubscribeDrapeResults = () => new Promise((resolve) => (release = resolve));
    const config = configSchema.parse({ NATS_URL: 'nats://nats:4222' });
    const service = await composeService(config, logger, {
      subscribeDrapeResults: late,
      connectBus: noBus,
    });
    await service.close();
    release({ close: async () => void calls.push('closed') });
    await wait(30);
    expect(calls).toEqual(['closed']);
  });
});
