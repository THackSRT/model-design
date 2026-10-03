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

  it('recrée le worker qui plante et renvoie la demande une fois', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerFitter(create).fit(measurements);
    workers[0]?.listeners['error']?.({ message: 'boom' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    expect(workers[0]?.terminated).toBe(true);
    expect(workers[1]?.sent).toHaveLength(1);
    const mannequin = fitted();
    workers[1]?.listeners['message']?.({
      data: { id: workers[1].sent[0]?.id, ok: true, mannequin },
    });
    await expect(pending).resolves.toBe(mannequin);
  });

  it('relance aussi sur un message illisible (messageerror)', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerFitter(create).fit(measurements);
    workers[0]?.listeners['messageerror']?.({});
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    const mannequin = fitted();
    workers[1]?.listeners['message']?.({
      data: { id: workers[1].sent[0]?.id, ok: true, mannequin },
    });
    await expect(pending).resolves.toBe(mannequin);
  });

  it('ignore la réponse tardive d’un ancien worker', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerFitter(create).fit(measurements);
    const oldId = workers[0]?.sent[0]?.id;
    workers[0]?.listeners['error']?.({ message: 'boom' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[0]?.listeners['message']?.({
      data: { id: oldId, ok: true, mannequin: { stale: true } },
    });
    const mannequin = fitted();
    workers[1]?.listeners['message']?.({
      data: { id: workers[1].sent[0]?.id, ok: true, mannequin },
    });
    await expect(pending).resolves.toBe(mannequin);
  });

  it('s’arrête après la borne de tentatives si le nouveau worker meurt aussi', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerFitter(create).fit(measurements);
    const assertion = expect(pending).rejects.toThrow('crash 2');
    workers[0]?.listeners['error']?.({ message: 'crash 1' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[1]?.listeners['error']?.({ message: 'crash 2' });
    await assertion;
    expect(workers).toHaveLength(2);
  });

  it('rejoue le dernier ajustement avant de renvoyer un habillage sur un worker neuf', async () => {
    const { create, workers } = fakeWorkers();
    const fitter = createWorkerFitter(create);
    const reply = (worker: number, index: number, payload: object) => {
      const w = workers[worker];
      w?.listeners['message']?.({ data: { id: w.sent[index]?.id, ok: true, ...payload } });
    };
    const fit = fitter.fit(measurements);
    reply(0, 0, { mannequin: fitted() });
    await fit;
    const dress = fitter.dress({} as never, 'skirt');
    workers[0]?.listeners['error']?.({ message: 'boom' });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(1));
    expect(workers[1]?.sent[0]).toHaveProperty('measurements');
    reply(1, 0, { mannequin: fitted() });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(2));
    const garment = { vertices: 1 };
    reply(1, 1, { garment });
    await expect(dress).resolves.toBe(garment);
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

describe('habillage sur un worker neuf (corps perdu)', () => {
  const setup = () => {
    const { create, workers } = fakeWorkers();
    const reply = (worker: number, index: number, payload: object, ok = true) => {
      const w = workers[worker];
      w?.listeners['message']?.({ data: { id: w.sent[index]?.id, ok, ...payload } });
    };
    return { fitter: createWorkerFitter(create, { timeoutMs: 1000 }), workers, reply };
  };
  const garment = { vertices: 1 };

  it('après un délai dépassé : le worker neuf reçoit d’abord le fit', async () => {
    vi.useFakeTimers();
    try {
      const { fitter, workers, reply } = setup();
      const fit = fitter.fit(measurements);
      reply(0, 0, { mannequin: fitted() });
      await fit;
      const slow = fitter.dress({} as never, 'skirt');
      const slowAssertion = expect(slow).rejects.toThrow('timeout');
      await vi.advanceTimersByTimeAsync(1000);
      await slowAssertion;
      const dress = fitter.dress({} as never, 'skirt');
      expect(workers[1]?.sent[0]).toHaveProperty('measurements');
      reply(1, 0, { mannequin: fitted() });
      await vi.advanceTimersByTimeAsync(0);
      expect(workers[1]?.sent).toHaveLength(2);
      reply(1, 1, { garment });
      await expect(dress).resolves.toBe(garment);
    } finally {
      vi.useRealTimers();
    }
  });

  it('après le plantage d’un worker inactif : le worker neuf reçoit d’abord le fit', async () => {
    const { fitter, workers, reply } = setup();
    const fit = fitter.fit(measurements);
    reply(0, 0, { mannequin: fitted() });
    await fit;
    workers[0]?.listeners['error']?.({ message: 'boom' });
    const dress = fitter.dress({} as never, 'skirt');
    expect(workers[1]?.sent[0]).toHaveProperty('measurements');
    reply(1, 0, { mannequin: fitted() });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(2));
    reply(1, 1, { garment });
    await expect(dress).resolves.toBe(garment);
  });

  it('fit rejoué en échec : l’erreur réelle remonte, sans envoyer l’habillage', async () => {
    const { fitter, workers, reply } = setup();
    const fit = fitter.fit(measurements);
    reply(0, 0, { mannequin: fitted() });
    await fit;
    workers[0]?.listeners['error']?.({ message: 'boom' });
    const dress = fitter.dress({} as never, 'skirt');
    const assertion = expect(dress).rejects.toThrow('mesures incohérentes');
    reply(1, 0, { message: 'mesures incohérentes' }, false);
    await assertion;
    expect(workers[1]?.sent).toHaveLength(1);
  });

  it('deux habillages en cours quand le worker meurt : un seul fit rejoué', async () => {
    const { fitter, workers, reply } = setup();
    const fit = fitter.fit(measurements);
    reply(0, 0, { mannequin: fitted() });
    await fit;
    const first = fitter.dress({} as never, 'skirt');
    const second = fitter.dress({} as never, 'skirt');
    workers[0]?.listeners['error']?.({ message: 'boom' });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(1));
    reply(1, 0, { mannequin: fitted() });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(3));
    const sent = workers[1]?.sent as Array<object>;
    expect(sent.filter((m) => 'measurements' in m)).toHaveLength(1);
    reply(1, 1, { garment });
    reply(1, 2, { garment });
    await expect(Promise.all([first, second])).resolves.toEqual([garment, garment]);
  });
});
