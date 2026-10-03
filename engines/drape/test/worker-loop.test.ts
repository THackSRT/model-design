import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { createApp } from '../src/adapters/bootstrap.js';
import { ConfigError, loadWorkerConfig } from '../src/adapters/config.js';
import { processMessages, type AckableMessage } from '../src/adapters/consumer-loop.js';
import { createTaskHandler } from '../src/adapters/handler.js';
import { DRAPE_CONSUMER, DRAPE_JOBS_STREAM, DRAPE_STREAM } from '../src/adapters/streams.js';
import { job, setup, silentLogger, taskOf } from './worker-helpers.js';

interface FakeMessage extends AckableMessage {
  ack: Mock<() => void>;
  nak: Mock<(delayMs?: number) => void>;
}

function fakeMessage(data: Uint8Array): FakeMessage {
  return {
    subject: 'drape.requested',
    data,
    working: vi.fn(),
    ack: vi.fn<() => void>(),
    nak: vi.fn<(delayMs?: number) => void>(),
  };
}

async function* source(...messages: AckableMessage[]): AsyncGenerator<AckableMessage> {
  await Promise.resolve();
  yield* messages;
}

describe('boucle de consommation (faux NATS)', () => {
  it('tâche valide : publication puis acquittement, dans cet ordre', async () => {
    const { publisher, deps } = setup();
    const order: string[] = [];
    const original = publisher.publish.bind(publisher);
    publisher.publish = async (m) => {
      await original(m);
      order.push('publish');
    };
    const message = fakeMessage(taskOf(job).data);
    message.ack.mockImplementation(() => order.push('ack'));
    await processMessages(source(message), createTaskHandler(deps), {
      logger: silentLogger(),
      retryDelayMs: 10_000,
    });
    expect(order).toEqual(['publish', 'ack']);
    expect(message.nak).not.toHaveBeenCalled();
  });

  it('message invalide : acquitté', async () => {
    const { deps } = setup();
    const message = fakeMessage(new TextEncoder().encode('[]'));
    await processMessages(source(message), createTaskHandler(deps), {
      logger: silentLogger(),
      retryDelayMs: 10_000,
    });
    expect(message.ack).toHaveBeenCalledOnce();
    expect(message.nak).not.toHaveBeenCalled();
  });

  it('panne S3 ou NATS : nak avec délai, pas d’acquittement, contenu non journalisé', async () => {
    const s3 = setup();
    s3.store.failing = true;
    const nats = setup();
    nats.publisher.failing = true;
    for (const { deps, logger } of [s3, nats]) {
      const message = fakeMessage(taskOf(job).data);
      await processMessages(source(message), createTaskHandler(deps), {
        logger,
        retryDelayMs: 10_000,
      });
      expect(message.ack).not.toHaveBeenCalled();
      expect(message.nak).toHaveBeenCalledWith(10_000);
      expect(logger.lines.join('\n')).not.toContain('statureMm');
      expect(logger.lines.join('\n')).not.toContain('panne');
    }
  });

  it('un message à la fois : le suivant attend la fin du précédent', async () => {
    const { runner, deps } = setup();
    const a = fakeMessage(taskOf(job).data);
    const b = fakeMessage(taskOf(job, { id: 'evt-2' }).data);
    a.ack.mockImplementation(() => expect(runner.runs).toBe(1));
    await processMessages(source(a, b), createTaskHandler(deps), {
      logger: silentLogger(),
      retryDelayMs: 1,
    });
    expect(b.ack).toHaveBeenCalledOnce();
  });
});

describe('déclarations NATS (identiques à celles de designs)', () => {
  it('flux DRAPE_JOBS en file de travail, DRAPE, consommateur durable « drape »', () => {
    expect(DRAPE_JOBS_STREAM).toMatchObject({
      name: 'DRAPE_JOBS',
      subjects: ['drape.requested'],
      maxAgeMs: 86_400_000,
    });
    expect(DRAPE_STREAM).toEqual({ name: 'DRAPE', subjects: ['drape.completed', 'drape.failed'] });
    expect(DRAPE_CONSUMER).toMatchObject({ stream: 'DRAPE_JOBS', durable: 'drape' });
    expect(DRAPE_CONSUMER.ackWaitMs / 3).toBeGreaterThan(1000);
  });
});

describe('configuration', () => {
  const full = {
    NATS_URL: 'nats://localhost:4222',
    S3_ENDPOINT: 'http://localhost:8333',
    S3_ACCESS_KEY_ID: 'dev-access',
    S3_SECRET_ACCESS_KEY: 'dev-secret-value',
  };

  it('sans NATS_URL : pas de travailleur', () => {
    expect(loadWorkerConfig({})).toBeUndefined();
    expect(loadWorkerConfig({ S3_ENDPOINT: 'http://x' })).toBeUndefined();
  });

  it('défauts : région us-east-1, seau drapes, délai 30 s', () => {
    expect(loadWorkerConfig(full)?.s3).toEqual({
      endpoint: 'http://localhost:8333',
      region: 'us-east-1',
      bucket: 'drapes',
      accessKeyId: 'dev-access',
      secretAccessKey: 'dev-secret-value',
      timeoutMs: 30_000,
    });
  });

  it('valeurs explicites', () => {
    const config = loadWorkerConfig({
      ...full,
      S3_REGION: 'eu-west-3',
      S3_BUCKET: 'autre',
      S3_TIMEOUT_MS: '5000',
    });
    expect(config?.s3).toMatchObject({ region: 'eu-west-3', bucket: 'autre', timeoutMs: 5000 });
  });

  it.each([
    ['S3_ENDPOINT', undefined],
    ['S3_ENDPOINT', 'pas une url'],
    ['S3_ACCESS_KEY_ID', ''],
    ['S3_SECRET_ACCESS_KEY', undefined],
    ['S3_TIMEOUT_MS', '10'],
    ['S3_TIMEOUT_MS', 'abc'],
  ])('refuse %s = %s sans citer de valeur', (name, value) => {
    const env: Record<string, string | undefined> = { ...full, [name]: value };
    let error: unknown;
    try {
      loadWorkerConfig(env);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toContain(name);
    expect((error as Error).message).not.toContain('dev-secret-value');
    expect((error as Error).message).not.toContain('pas une url');
  });
});

describe('démarrage', () => {
  it('sans NATS_URL : serveur de santé seul, travailleur jamais lancé', async () => {
    const start = vi.fn();
    const app = createApp({}, silentLogger(), start);
    expect(app.worker).toBeUndefined();
    expect(start).not.toHaveBeenCalled();
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const port = (app.server.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${String(port)}/health`);
    expect(res.status).toBe(200);
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
  });

  it('avec NATS_URL et S3 : lance le travailleur avec la configuration', async () => {
    const stop = vi.fn();
    const start = vi.fn(() => Promise.resolve({ stop }));
    const app = createApp(
      {
        NATS_URL: 'nats://x:4222',
        S3_ENDPOINT: 'http://s3:8333',
        S3_ACCESS_KEY_ID: 'a',
        S3_SECRET_ACCESS_KEY: 'b',
      },
      silentLogger(),
      start,
    );
    expect(await app.worker).toEqual({ stop });
    expect(start).toHaveBeenCalledOnce();
    app.server.close();
  });

  it('avec NATS_URL mais sans S3 : configuration refusée', () => {
    expect(() => createApp({ NATS_URL: 'nats://x:4222' }, silentLogger(), vi.fn())).toThrow(
      ConfigError,
    );
  });
});
