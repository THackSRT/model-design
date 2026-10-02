import type { FittedMannequin, MannequinEngine } from '@atelier/mannequin';
import { describe, expect, it, vi } from 'vitest';
import { handleFitRequest, transferablesOf } from '../src/platform/fit-protocol.js';
import { createWorkerFitter, type WorkerLike } from '../src/platform/worker-fitter.js';

type MeasurementSet = Parameters<MannequinEngine['fit']>[0];
const measurements = { sex: 'female' } as MeasurementSet;
const fitted = (): FittedMannequin => ({
  body: {
    positions: new Float32Array(9),
    normals: new Float32Array(9),
    index: Uint32Array.of(0, 1, 2),
  },
  measuredMm: { chest: 880 },
  landmarksMm: {
    crotch: 780,
    hip: 900,
    waist: 1050,
    neck: 1400,
    knee: 480,
    ankle: 80,
    shoulder: 1330,
    wrist: 820,
  },
  armsMm: {
    left: {
      shoulder: [180, 1330, 0],
      wrist: [260, 820, 40],
      axis: [0.155, -0.985, 0.077],
      lengthMm: 518,
    },
    right: {
      shoulder: [-180, 1330, 0],
      wrist: [-260, 820, 40],
      axis: [-0.155, -0.985, 0.077],
      lengthMm: 518,
    },
  },
});

describe('traitement d’une demande d’ajustement (worker)', () => {
  it('renvoie le résultat et la liste des tampons à transférer', () => {
    const mannequin = fitted();
    const fit = vi.fn(() => mannequin);
    const { response, transfer } = handleFitRequest({ fit } as MannequinEngine, {
      id: 7,
      measurements,
      options: { age: 40 },
    });
    expect(fit).toHaveBeenCalledWith(measurements, { age: 40 });
    expect(response).toEqual({ id: 7, ok: true, mannequin });
    expect(transfer).toEqual([
      mannequin.body.positions.buffer,
      mannequin.body.normals.buffer,
      mannequin.body.index.buffer,
    ]);
  });

  it('ne liste qu’une fois un tampon partagé', () => {
    const mannequin = fitted();
    mannequin.body.normals = new Float32Array(mannequin.body.positions.buffer);
    expect(transferablesOf(mannequin)).toHaveLength(2);
  });

  it('transmet les champs en plus tels quels', () => {
    const mannequin = { ...fitted(), extra: { neck: [0, 1, 2] } };
    const { response } = handleFitRequest({ fit: () => mannequin }, { id: 1, measurements });
    expect(response).toMatchObject({ ok: true, mannequin: { extra: { neck: [0, 1, 2] } } });
  });

  it('rend une erreur sans tampon quand l’ajustement échoue', () => {
    const engine: MannequinEngine = {
      fit: () => {
        throw new Error('mesures incohérentes');
      },
    };
    expect(handleFitRequest(engine, { id: 2, measurements })).toEqual({
      response: { id: 2, ok: false, message: 'mesures incohérentes' },
      transfer: [],
    });
  });
});

type Listeners = Record<string, (e: unknown) => void>;

function fakeWorkers() {
  const workers: Array<{ listeners: Listeners; sent: Array<{ id: number }>; terminated: boolean }> =
    [];
  const create = (): WorkerLike => {
    const w = { listeners: {} as Listeners, sent: [] as Array<{ id: number }>, terminated: false };
    workers.push(w);
    return {
      postMessage: (m: { id: number }) => w.sent.push(m),
      terminate: () => {
        w.terminated = true;
      },
      addEventListener: (type: string, l: (e: never) => void) => {
        w.listeners[type] = l as (e: unknown) => void;
      },
    } as unknown as WorkerLike;
  };
  return { create, workers };
}

describe('adaptateur Web Worker', () => {
  it('relie chaque réponse à sa demande par l’identifiant', async () => {
    const { create, workers } = fakeWorkers();
    const fitter = createWorkerFitter(create);
    const first = fitter.fit(measurements);
    const second = fitter.fit(measurements);
    const [w] = workers;
    const mannequin = fitted();
    w?.listeners['message']?.({ data: { id: w.sent[1]?.id, ok: true, mannequin } });
    w?.listeners['message']?.({ data: { id: w.sent[0]?.id, ok: false, message: 'non' } });
    await expect(second).resolves.toBe(mannequin);
    await expect(first).rejects.toThrow('non');
  });

  it('rejette les demandes en cours si le worker plante', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerFitter(create).fit(measurements);
    workers[0]?.listeners['error']?.({ message: 'boom' });
    await expect(pending).rejects.toThrow('boom');
    expect(workers[0]?.terminated).toBe(true);
  });

  it('rejette la demande sur un message illisible (messageerror)', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerFitter(create).fit(measurements);
    workers[0]?.listeners['messageerror']?.({});
    await expect(pending).rejects.toThrow('message error');
  });

  it('rejette après le délai maximal, puis recrée le worker à la demande suivante', async () => {
    vi.useFakeTimers();
    try {
      const { create, workers } = fakeWorkers();
      const fitter = createWorkerFitter(create, { timeoutMs: 1000 });
      const pending = fitter.fit(measurements);
      const assertion = expect(pending).rejects.toThrow('timeout');
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(workers[0]?.terminated).toBe(true);
      void fitter.fit(measurements).catch(() => undefined);
      expect(workers).toHaveLength(2);
      expect(workers[1]?.sent).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ne rejette pas une demande qui a reçu sa réponse à temps', async () => {
    vi.useFakeTimers();
    try {
      const { create, workers } = fakeWorkers();
      const fitter = createWorkerFitter(create, { timeoutMs: 1000 });
      const pending = fitter.fit(measurements);
      const mannequin = fitted();
      workers[0]?.listeners['message']?.({
        data: { id: workers[0].sent[0]?.id, ok: true, mannequin },
      });
      await expect(pending).resolves.toBe(mannequin);
      await vi.advanceTimersByTimeAsync(5000);
      expect(workers[0]?.terminated).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
