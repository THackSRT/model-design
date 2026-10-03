import type { Drape } from '@atelier/contracts-ts';
import { err, ok } from '@atelier/kernel';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiProblem, DesignsClient } from '../src/api/designs-client.js';
import {
  DRAPE_ARM_ANGLE_DEG,
  DRAPE_POLL_MS,
  type DrapeFabric,
  drapeRequestBody,
  useDrape,
} from '../src/drape/use-drape.js';

const fabric: DrapeFabric = { preset: 'linen' };
const problem: ApiProblem = { type: '/problems/not-found', title: 'x', status: 404 };
const drape = (status: Drape['status'], extra: Partial<Drape> = {}): Drape => ({
  id: 'dr1',
  status,
  createdAt: '2026-10-03T10:00:00.000Z',
  ...extra,
});
const glb = new ArrayBuffer(8);

function setup(first: Drape = drape('pending')) {
  const designs = {
    requestDrape: vi.fn<DesignsClient['requestDrape']>(async () => ok(first)),
    getDrape: vi.fn<DesignsClient['getDrape']>(async () => ok(drape('completed'))),
    getDrapeModel: vi.fn<DesignsClient['getDrapeModel']>(async () => ok(glb)),
  };
  return { designs, deps: { designs: designs as unknown as DesignsClient } };
}
const ref = (versionNumber: number, designId = 'd1') => ({ designId, versionNumber });
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const start = (r: { current: { actions: { request(): void } } }) =>
  act(async () => {
    r.current.actions.request();
    await vi.advanceTimersByTimeAsync(0);
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDrape', () => {
  it('sans version enregistrée : au repos, action désactivée, aucun appel', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDrape(deps, undefined, fabric));
    expect(result.current.state).toEqual({ status: 'idle', canRequest: false });
    await start(result);
    expect(designs.requestDrape).not.toHaveBeenCalled();
  });

  it('sans tissu : action désactivée', () => {
    const { deps } = setup();
    const { result } = renderHook(() => useDrape(deps, ref(1)));
    expect(result.current.state.canRequest).toBe(false);
  });

  it("l'angle partagé est l'horizontale (90°) et la demande l'envoie", () => {
    expect(DRAPE_ARM_ANGLE_DEG).toBe(90);
    expect(drapeRequestBody(fabric).avatar).toEqual({ armAngleDeg: DRAPE_ARM_ANGLE_DEG });
  });

  it('demande en brouillon, interroge toutes les 2 s puis lit le modèle', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDrape(deps, ref(2), fabric));
    expect(result.current.state).toEqual({ status: 'idle', canRequest: true });
    await start(result);
    expect(designs.requestDrape).toHaveBeenCalledWith('d1', 2, {
      fabric,
      avatar: { armAngleDeg: 90 },
      quality: 'draft',
    });
    expect(result.current.state.status).toBe('pending');
    expect(result.current.state.canRequest).toBe(false);
    await tick(DRAPE_POLL_MS - 1);
    expect(designs.getDrape).not.toHaveBeenCalled();
    await tick(1);
    expect(designs.getDrape).toHaveBeenCalledWith('d1', 2, 'dr1');
    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.drape?.status).toBe('completed');
    expect(result.current.state.model).toBe(glb);
    expect(designs.getDrapeModel).toHaveBeenCalledWith('d1', 2, 'dr1');
  });

  it('une réponse déjà completed (drapé existant) lit le modèle sans interroger', async () => {
    const { deps, designs } = setup(drape('completed'));
    const { result } = renderHook(() => useDrape(deps, ref(1), fabric));
    await start(result);
    expect(result.current.state.status).toBe('completed');
    expect(designs.getDrape).not.toHaveBeenCalled();
  });

  it('une seule interrogation en vol : un deuxième appel de request est ignoré', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDrape(deps, ref(1), fabric));
    await start(result);
    await start(result);
    expect(designs.requestDrape).toHaveBeenCalledTimes(1);
    designs.getDrape.mockImplementation(() => new Promise(() => undefined));
    await tick(DRAPE_POLL_MS * 5);
    expect(designs.getDrape).toHaveBeenCalledTimes(1);
  });

  it('failed : rend le problemType, sans lire le modèle', async () => {
    const { deps, designs } = setup();
    const failed = drape('failed', { problemType: '/problems/drape-seam-not-closed' });
    designs.getDrape.mockResolvedValue(ok(failed));
    const { result } = renderHook(() => useDrape(deps, ref(1), fabric));
    await start(result);
    await tick(DRAPE_POLL_MS);
    expect(result.current.state.status).toBe('failed');
    expect(result.current.state.problemType).toBe('/problems/drape-seam-not-closed');
    expect(designs.getDrapeModel).not.toHaveBeenCalled();
    expect(result.current.state.canRequest).toBe(true);
  });

  it('error : problème HTTP de la demande', async () => {
    const { deps, designs } = setup();
    designs.requestDrape.mockResolvedValue(err(problem));
    const { result } = renderHook(() => useDrape(deps, ref(1), fabric));
    await start(result);
    expect(result.current.state).toMatchObject({ status: 'error', problem });
  });

  it("error : problème HTTP de l'interrogation ou du modèle", async () => {
    const { deps, designs } = setup();
    designs.getDrape.mockResolvedValue(err(problem));
    const { result } = renderHook(() => useDrape(deps, ref(1), fabric));
    await start(result);
    await tick(DRAPE_POLL_MS);
    expect(result.current.state).toMatchObject({ status: 'error', problem });
    designs.getDrape.mockResolvedValue(ok(drape('completed')));
    designs.getDrapeModel.mockResolvedValue(err(problem));
    await start(result);
    await tick(DRAPE_POLL_MS);
    expect(result.current.state).toMatchObject({ status: 'error', problem });
  });

  it('démontage : plus aucun appel', async () => {
    const { deps, designs } = setup();
    const { result, unmount } = renderHook(() => useDrape(deps, ref(1), fabric));
    await start(result);
    unmount();
    await tick(DRAPE_POLL_MS * 3);
    expect(designs.getDrape).not.toHaveBeenCalled();
  });

  it('la version change : retour au repos, plus aucun appel du suivi précédent', async () => {
    const { deps, designs } = setup();
    const { result, rerender } = renderHook(({ n }) => useDrape(deps, ref(n), fabric), {
      initialProps: { n: 1 },
    });
    await start(result);
    expect(result.current.state.status).toBe('pending');
    rerender({ n: 2 });
    expect(result.current.state).toEqual({ status: 'idle', canRequest: true });
    await tick(DRAPE_POLL_MS * 2);
    expect(designs.getDrape).not.toHaveBeenCalled();
  });

  it('le tissu change : retour au repos ; un tissu de même valeur ne remet rien à zéro', async () => {
    const { deps } = setup();
    const { result, rerender } = renderHook(({ f }) => useDrape(deps, ref(1), f), {
      initialProps: { f: fabric },
    });
    await start(result);
    rerender({ f: { ...fabric } });
    expect(result.current.state.status).toBe('pending');
    rerender({ f: { preset: 'denim' } });
    expect(result.current.state.status).toBe('idle');
  });

  it("ignore la réponse d'une version précédente", async () => {
    const { deps, designs } = setup();
    let release: (value: Awaited<ReturnType<DesignsClient['requestDrape']>>) => void = () =>
      undefined;
    designs.requestDrape.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)),
    );
    const { result, rerender } = renderHook(({ n }) => useDrape(deps, ref(n), fabric), {
      initialProps: { n: 1 },
    });
    await start(result);
    rerender({ n: 2 });
    await act(async () => {
      release(ok(drape('completed')));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state.status).toBe('idle');
    expect(designs.getDrapeModel).not.toHaveBeenCalled();
  });
});
