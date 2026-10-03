import { JetStreamApiCodes, JetStreamApiError, StorageType } from '@nats-io/jetstream';
import { describe, expect, it } from 'vitest';
import { applyStream, type StreamsApi } from './ensure-stream.js';

type Config = Parameters<StreamsApi['add']>[0];

const notFound = () =>
  new JetStreamApiError({
    code: 404,
    err_code: JetStreamApiCodes.StreamNotFound,
    description: 'stream not found',
  });

/** Gestionnaire JetStream simulé : un flux au plus, avec la rétention donnée si présent. */
function fakeStreams(existing?: { retention: string }) {
  const calls: { op: 'add' | 'update'; config: Config }[] = [];
  const streams: StreamsApi = {
    info: async () => {
      if (!existing) throw notFound();
      return { config: existing };
    },
    add: async (config) => void calls.push({ op: 'add', config }),
    update: async (_name, config) => void calls.push({ op: 'update', config }),
  };
  return { streams, calls };
}

describe('applyStream', () => {
  const base = { name: 'JOBS', subjects: ['job.requested'] };

  it('crée le flux en stockage fichier, sans rétention ni âge si non demandés (comportement d’origine)', async () => {
    const { streams, calls } = fakeStreams();
    await applyStream(streams, base);
    expect(calls).toEqual([
      {
        op: 'add',
        config: { name: 'JOBS', subjects: ['job.requested'], storage: StorageType.File },
      },
    ]);
  });

  it('crée une file de travail avec un âge maximal converti en nanosecondes', async () => {
    const { streams, calls } = fakeStreams();
    await applyStream(streams, { ...base, retention: 'workqueue', maxAgeMs: 24 * 3_600_000 });
    expect(calls[0]).toMatchObject({
      op: 'add',
      config: { retention: 'workqueue', max_age: 24 * 3_600_000 * 1_000_000 },
    });
  });

  it('met à jour sujets et âge d’un flux existant de même rétention', async () => {
    const { streams, calls } = fakeStreams({ retention: 'workqueue' });
    await applyStream(streams, { ...base, retention: 'workqueue', maxAgeMs: 1000 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ op: 'update', config: { max_age: 1_000_000_000 } });
  });

  it('met à jour sans rétention demandée, quelle que soit celle du flux existant', async () => {
    const { streams, calls } = fakeStreams({ retention: 'workqueue' });
    await applyStream(streams, base);
    expect(calls.map((c) => c.op)).toEqual(['update']);
  });

  it('échoue clairement quand la rétention d’un flux existant diffère', async () => {
    const { streams, calls } = fakeStreams({ retention: 'limits' });
    await expect(applyStream(streams, { ...base, retention: 'workqueue' })).rejects.toThrow(
      /rétention limits existante, workqueue demandée/,
    );
    expect(calls).toEqual([]);
  });

  it('refuse un âge maximal qui n’est pas un entier positif', async () => {
    for (const maxAgeMs of [0, -1, 1.5, Number.NaN]) {
      const { streams } = fakeStreams();
      await expect(applyStream(streams, { ...base, maxAgeMs })).rejects.toThrow(RangeError);
    }
  });

  it('relaie toute autre erreur du gestionnaire', async () => {
    const streams: StreamsApi = {
      info: async () => {
        throw new Error('panne');
      },
      add: async () => undefined,
      update: async () => undefined,
    };
    await expect(applyStream(streams, base)).rejects.toThrow('panne');
  });
});
