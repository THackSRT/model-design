import type { FittedMannequin, GarmentMesh } from '@atelier/mannequin';
import { describe, expect, it, vi } from 'vitest';
import {
  handleDressRequest,
  handleFitRequest,
  type DressRequest,
  type WorkerState,
} from '../src/platform/fit-protocol.js';
import { createWorkerFitter, type WorkerLike } from '../src/platform/worker-fitter.js';

const garment = (): GarmentMesh => ({
  positions: new Float32Array(9),
  normals: new Float32Array(9),
  index: Uint32Array.of(0, 1, 2),
  tightZones: [{ fromMm: 820, toMm: 900, shortfallMm: 70 }],
});
const dressMannequin = vi.hoisted(() => vi.fn());

vi.mock('@atelier/mannequin', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  dressMannequin,
}));

const fitted = (): FittedMannequin => ({
  body: {
    positions: Float32Array.of(1, 2, 3),
    normals: new Float32Array(3),
    index: Uint32Array.of(0, 1, 2),
  },
  measuredMm: {},
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
const request: DressRequest = {
  kind: 'dress',
  id: 4,
  spec: { specVersion: '1.0' } as DressRequest['spec'],
  garment: { type: 'straight-skirt' },
};

describe('habillage dans le worker', () => {
  it('garde une copie du dernier corps, même quand l’original est transféré', () => {
    const state: WorkerState = {};
    const mannequin = fitted();
    handleFitRequest(
      { fit: () => mannequin } as never,
      { id: 1, measurements: {} as never },
      state,
    );
    expect(state.last?.body.positions).toEqual(mannequin.body.positions);
    expect(state.last?.body.positions.buffer).not.toBe(mannequin.body.positions.buffer);
  });

  it('habille le dernier corps ajusté et liste les tampons à transférer', () => {
    const state: WorkerState = { last: fitted() };
    const mesh = garment();
    dressMannequin.mockReturnValueOnce(mesh);
    const { response, transfer } = handleDressRequest(state, request);
    expect(dressMannequin).toHaveBeenCalledWith(
      state.last,
      request.spec,
      request.garment,
      undefined,
    );
    expect(response).toEqual({ id: 4, ok: true, garment: mesh });
    expect(transfer).toEqual([mesh.positions.buffer, mesh.normals.buffer, mesh.index.buffer]);
  });

  it('sans corps ajusté : erreur, aucun tampon', () => {
    expect(handleDressRequest({}, request)).toEqual({
      response: { id: 4, ok: false, message: 'no mannequin fitted' },
      transfer: [],
    });
  });

  it('une erreur du moteur est rendue sans tampon', () => {
    dressMannequin.mockImplementationOnce(() => {
      throw new Error('patron illisible');
    });
    const { response, transfer } = handleDressRequest({ last: fitted() }, request);
    expect(response).toEqual({ id: 4, ok: false, message: 'patron illisible' });
    expect(transfer).toEqual([]);
  });
});

describe('adaptateur : habillage', () => {
  it('envoie un message « habiller » et rend le maillage', async () => {
    const sent: Array<Record<string, unknown>> = [];
    let listener: (e: { data: unknown }) => void = () => undefined;
    const worker = {
      postMessage: (m: Record<string, unknown>) => sent.push(m),
      terminate: () => undefined,
      addEventListener: (type: string, l: typeof listener) => {
        if (type === 'message') listener = l;
      },
    } as unknown as WorkerLike;
    const fitter = createWorkerFitter(() => worker);
    const pending = fitter.dress(request.spec, 'trousers');
    expect(sent[0]).toMatchObject({ kind: 'dress', garment: { type: 'trousers' } });
    const mesh = garment();
    listener({ data: { id: sent[0]?.id, ok: true, garment: mesh } });
    await expect(pending).resolves.toBe(mesh);
  });
});

describe('ajustement de consultation (drapé) isolé de l’habillage', () => {
  const measurements = { sex: 'female' } as never;
  const bodyOf = (marker: number): FittedMannequin => {
    const mannequin = fitted();
    mannequin.body.positions[0] = marker;
    return mannequin;
  };
  const engine = {
    fit: (_m: unknown, options?: { armAngleDeg?: number }) => bodyOf(options?.armAngleDeg ?? 0),
  };

  it('protocole : keep=false ne remplace pas le corps gardé', () => {
    const state: WorkerState = {};
    handleFitRequest(engine as never, { id: 1, measurements }, state);
    handleFitRequest(
      engine as never,
      { id: 2, measurements, options: { armAngleDeg: 30 }, keep: false },
      state,
    );
    expect(state.last?.body.positions[0]).toBe(0);
  });

  it('fit par défaut, fit du drapé à 30°, puis dress : habille le corps par défaut', () => {
    const state: WorkerState = {};
    handleFitRequest(engine as never, { id: 1, measurements }, state);
    handleFitRequest(
      engine as never,
      { id: 2, measurements, options: { armAngleDeg: 30 }, keep: false },
      state,
    );
    dressMannequin.mockReturnValueOnce(garment());
    handleDressRequest(state, request);
    expect(dressMannequin.mock.calls.at(-1)?.[0].body.positions[0]).toBe(0);
  });

  it('après mort du worker, le rejeu est le dernier fit par défaut, pas celui du drapé', async () => {
    const workers: Array<{
      sent: Array<Record<string, unknown>>;
      listener: (e: unknown) => void;
      fail: (e: unknown) => void;
    }> = [];
    const create = (): WorkerLike => {
      const w = {
        sent: [] as Array<Record<string, unknown>>,
        listener: (() => undefined) as (e: unknown) => void,
        fail: (() => undefined) as (e: unknown) => void,
      };
      workers.push(w);
      return {
        postMessage: (m: Record<string, unknown>) => w.sent.push(m),
        terminate: () => undefined,
        addEventListener: (type: string, l: (e: unknown) => void) => {
          if (type === 'message') w.listener = l;
          if (type === 'error') w.fail = l;
        },
      } as unknown as WorkerLike;
    };
    const fitter = createWorkerFitter(create);
    const reply = (worker: number, index: number, payload: object) => {
      const w = workers[worker];
      w?.listener({ data: { id: w.sent[index]?.id, ok: true, ...payload } });
    };
    const first = fitter.fit(measurements, { age: 40 });
    reply(0, 0, { mannequin: fitted() });
    await first;
    const view = fitter.fitForView(measurements, { armAngleDeg: 30 });
    expect(workers[0]?.sent[1]).toMatchObject({ keep: false });
    reply(0, 1, { mannequin: fitted() });
    await view;
    const dress = fitter.dress(request.spec, 'skirt');
    workers[0]?.fail({ message: 'boom' });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(1));
    expect(workers[1]?.sent[0]).toMatchObject({ options: { age: 40 } });
    expect(workers[1]?.sent[0]).not.toHaveProperty('keep');
    reply(1, 0, { mannequin: fitted() });
    await vi.waitFor(() => expect(workers[1]?.sent).toHaveLength(2));
    reply(1, 1, { garment: garment() });
    await dress;
  });

  it('un fit de consultation seul sur un worker neuf ne le dit pas « ajusté »', async () => {
    const sent: Array<Record<string, unknown>> = [];
    let listener: (e: unknown) => void = () => undefined;
    const worker = {
      postMessage: (m: Record<string, unknown>) => sent.push(m),
      terminate: () => undefined,
      addEventListener: (type: string, l: typeof listener) => {
        if (type === 'message') listener = l;
      },
    } as unknown as WorkerLike;
    const fitter = createWorkerFitter(() => worker);
    const view = fitter.fitForView(measurements);
    listener({ data: { id: sent[0]?.id, ok: true, mannequin: fitted() } });
    await view;
    void fitter.dress(request.spec, 'skirt').catch(() => undefined);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toMatchObject({ kind: 'dress' });
  });
});
