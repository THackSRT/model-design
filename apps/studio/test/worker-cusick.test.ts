import { FABRIC_PRESETS } from '@atelier/drape';
import { describe, expect, it, vi } from 'vitest';
import type { CusickRequest } from '../src/platform/cusick-protocol.js';
import { createWorkerCusickRunner, type CusickWorkerLike } from '../src/platform/worker-cusick.js';

const fabric = FABRIC_PRESETS['cotton-poplin'];
const result = { drapeCoefficient: 0.5, converged: true, simulatedSteps: 10, engineVersion: 'x' };

type Listeners = Record<string, (e: unknown) => void>;
interface Fake {
  listeners: Listeners;
  sent: CusickRequest[];
  terminated: boolean;
}

function fakeWorkers() {
  const workers: Fake[] = [];
  const create = (): CusickWorkerLike => {
    const w: Fake = { listeners: {}, sent: [], terminated: false };
    workers.push(w);
    return {
      postMessage: (m: CusickRequest) => w.sent.push(m),
      terminate: () => {
        w.terminated = true;
      },
      addEventListener: (type: string, l: (e: never) => void) => {
        w.listeners[type] = l as (e: unknown) => void;
      },
    } as unknown as CusickWorkerLike;
  };
  return { create, workers };
}

const reply = (w: Fake | undefined, outline: Float64Array, index = 0) =>
  w?.listeners['message']?.({
    data: { id: w.sent[index]?.id, ok: true, result, outlineMm: outline },
  });

describe('adaptateur Web Worker de l’essai de Cusick', () => {
  it('ne crée aucun worker avant la première demande, puis le réutilise', async () => {
    const { create, workers } = fakeWorkers();
    const runner = createWorkerCusickRunner(create);
    expect(workers).toHaveLength(0);
    const first = runner.run(fabric);
    expect(workers[0]?.sent[0]).toMatchObject({ fabric, edgeMm: 7.5 });
    reply(workers[0], Float64Array.of(1, 2, 3, 4, 5, 6));
    await expect(first).resolves.toMatchObject({
      ...result,
      outlineMm: Float64Array.of(1, 2, 3, 4, 5, 6),
    });
    void runner.run(fabric);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.sent).toHaveLength(2);
  });

  it('rejette avec le message du worker quand l’essai échoue', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerCusickRunner(create).run(fabric);
    workers[0]?.listeners['message']?.({
      data: { id: workers[0].sent[0]?.id, ok: false, message: 'tissu invalide' },
    });
    await expect(pending).rejects.toThrow('tissu invalide');
  });

  it('rejette après le délai maximal, puis recrée le worker à la demande suivante', async () => {
    vi.useFakeTimers();
    try {
      const { create, workers } = fakeWorkers();
      const runner = createWorkerCusickRunner(create, { timeoutMs: 1000 });
      const pending = runner.run(fabric);
      const assertion = expect(pending).rejects.toThrow('timeout');
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(workers[0]?.terminated).toBe(true);
      void runner.run(fabric).catch(() => undefined);
      expect(workers).toHaveLength(2);
      expect(workers[1]?.sent).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ne laisse aucun minuteur après une réponse à temps', async () => {
    vi.useFakeTimers();
    try {
      const { create, workers } = fakeWorkers();
      const pending = createWorkerCusickRunner(create, { timeoutMs: 1000 }).run(fabric);
      reply(workers[0], new Float64Array(0));
      await pending;
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(5000);
      expect(workers[0]?.terminated).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recrée le worker qui plante et renvoie l’essai une fois', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerCusickRunner(create).run(fabric);
    workers[0]?.listeners['error']?.({ message: 'boom' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    expect(workers[0]?.terminated).toBe(true);
    expect(workers[1]?.sent).toHaveLength(1);
    reply(workers[1], new Float64Array(0));
    await expect(pending).resolves.toMatchObject(result);
  });

  it('ignore la réponse tardive d’un ancien worker', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerCusickRunner(create).run(fabric);
    const oldId = workers[0]?.sent[0]?.id;
    workers[0]?.listeners['messageerror']?.({});
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[0]?.listeners['message']?.({
      data: { id: oldId, ok: true, result: { ...result, drapeCoefficient: 0.99 }, outlineMm: [] },
    });
    reply(workers[1], new Float64Array(0));
    await expect(pending).resolves.toMatchObject({ drapeCoefficient: 0.5 });
  });

  it('s’arrête après la borne de tentatives si le nouveau worker meurt aussi', async () => {
    const { create, workers } = fakeWorkers();
    const pending = createWorkerCusickRunner(create).run(fabric);
    const assertion = expect(pending).rejects.toThrow('crash 2');
    workers[0]?.listeners['error']?.({ message: 'crash 1' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[1]?.listeners['error']?.({ message: 'crash 2' });
    await assertion;
    expect(workers).toHaveLength(2);
  });

  it('file d’attente : un seul essai à la fois au worker, le délai court à partir de l’envoi', async () => {
    vi.useFakeTimers();
    try {
      const { create, workers } = fakeWorkers();
      const runner = createWorkerCusickRunner(create, { timeoutMs: 1000 });
      const runs = [runner.run(fabric), runner.run(fabric), runner.run(fabric)];
      for (let k = 0; k < 3; k += 1) {
        expect(workers[0]?.sent).toHaveLength(k + 1);
        await vi.advanceTimersByTimeAsync(800); // chaque essai est lent mais tient sous le délai
        reply(workers[0], new Float64Array(0), k);
        await vi.advanceTimersByTimeAsync(0);
      }
      await expect(Promise.all(runs)).resolves.toHaveLength(3);
      expect(workers).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('un délai dépassé ne rejette que l’essai en cours : les suivants passent sur le worker neuf', async () => {
    vi.useFakeTimers();
    try {
      const { create, workers } = fakeWorkers();
      const runner = createWorkerCusickRunner(create, { timeoutMs: 1000 });
      const first = runner.run(fabric);
      const second = runner.run(fabric);
      const third = runner.run(fabric);
      const assertion = expect(first).rejects.toThrow('timeout');
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(workers[0]?.terminated).toBe(true);
      expect(workers).toHaveLength(2);
      expect(workers[1]?.sent).toHaveLength(1);
      reply(workers[1], new Float64Array(0), 0);
      await vi.advanceTimersByTimeAsync(0);
      reply(workers[1], new Float64Array(0), 1);
      await expect(Promise.all([second, third])).resolves.toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
