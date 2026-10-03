import type {
  DesignVersion,
  DesignVersionChanges,
  DesignVersionSummary,
} from '@atelier/contracts-ts';
import { err, ok } from '@atelier/kernel';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiProblem, DesignsClient } from '../src/api/designs-client.js';
import { useDesignHistory } from '../src/design-history/use-design-history.js';
import { initialForm, toVersionRequest } from '../src/pattern-studio/form.js';
import { spec } from './fakes.js';

const problem: ApiProblem = { type: '/problems/not-found', title: 'x', status: 404 };

const summary = (number: number): DesignVersionSummary => ({
  number,
  createdAt: '2026-09-30T10:00:00.000Z',
  fingerprint: String(number).repeat(64).slice(0, 64),
  engineVersion: '0.1.0',
  garment: { type: 'straight-skirt', params: { lengthMm: 600 } },
});
const range = (from: number, to: number) =>
  Array.from({ length: from - to + 1 }, (_, i) => summary(from - i));

function fullVersion(number: number, wider = false): DesignVersion {
  const base = toVersionRequest(initialForm);
  if (base.isErr()) throw new Error('formulaire invalide');
  const width = wider ? 300 : 250;
  const front = spec.panels[0];
  return {
    ...base.value,
    designId: 'd1',
    number,
    createdAt: '2026-09-30T10:00:00.000Z',
    fingerprint: 'f'.repeat(64),
    spec: {
      ...spec,
      panels: [
        {
          ...front,
          edges: [
            { id: 'a', from: [0, 0], to: [width, 0] },
            { id: 'b', from: [width, 0], to: [width, 100] },
            { id: 'c', from: [width, 100], to: [0, 100] },
            { id: 'd', from: [0, 100], to: [0, 0] },
          ],
        },
      ],
    } as DesignVersion['spec'],
  };
}

function setup() {
  const designs = {
    listVersions: vi.fn<DesignsClient['listVersions']>(async (_id, page) =>
      page?.cursor === undefined
        ? ok({ designId: 'd1', items: range(25, 6), nextCursor: '5' })
        : ok({ designId: 'd1', items: range(5, 1) }),
    ),
    getVersion: vi.fn<DesignsClient['getVersion']>(async (_id, n) => ok(fullVersion(n, n === 2))),
    getVersionChanges: vi.fn<DesignsClient['getVersionChanges']>(async (id, to, since) =>
      ok({
        designId: id,
        from: summary(since),
        to: summary(to),
        sameFingerprint: false,
        params: [{ path: 'lengthMm', from: 600, to: 650 }],
        measurements: [],
      } satisfies DesignVersionChanges),
    ),
  };
  return { designs, deps: { designs: designs as unknown as DesignsClient } };
}
const model = (versionNumber: number, designId = 'd1') => ({ designId, versionNumber });

describe('modèle de vue de l’historique', () => {
  it('sans modèle : au repos, aucun appel', () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDesignHistory(deps));
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.versions).toEqual([]);
    expect(designs.listVersions).not.toHaveBeenCalled();
  });

  it('charge la première page', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(designs.listVersions).toHaveBeenCalledWith('d1', { limit: 20 });
    expect(result.current.state.versions).toHaveLength(20);
    expect(result.current.state.versions[0]?.number).toBe(25);
    expect(result.current.state.hasMore).toBe(true);
    expect(JSON.stringify(result.current.state)).not.toContain('statureMm');
  });

  it('page suivante : ajoute les anciennes avec le curseur, puis plus rien', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.actions.loadMore());
    expect(result.current.state.loadingMore).toBe(true);
    await waitFor(() => expect(result.current.state.loadingMore).toBe(false));
    expect(designs.listVersions).toHaveBeenLastCalledWith('d1', { cursor: '5', limit: 20 });
    expect(result.current.state.versions.map((v) => v.number)).toEqual(
      range(25, 1).map((v) => v.number),
    );
    expect(result.current.state.hasMore).toBe(false);
    act(() => result.current.actions.loadMore());
    expect(designs.listVersions).toHaveBeenCalledTimes(2);
  });

  it('recharge après une nouvelle version du studio', async () => {
    const { deps, designs } = setup();
    const { result, rerender } = renderHook(({ n }) => useDesignHistory(deps, model(n)), {
      initialProps: { n: 25 },
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    designs.listVersions.mockResolvedValueOnce(
      ok({ designId: 'd1', items: range(26, 7), nextCursor: '6' }),
    );
    rerender({ n: 26 });
    await waitFor(() => expect(result.current.state.versions[0]?.number).toBe(26));
    expect(designs.listVersions).toHaveBeenCalledTimes(2);
  });

  it('un changement de modèle vide tout, la réponse de l’ancien est ignorée', async () => {
    const { deps, designs } = setup();
    const { result, rerender } = renderHook(({ id }) => useDesignHistory(deps, model(1, id)), {
      initialProps: { id: 'd1' },
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    let release: (() => void) | undefined;
    designs.listVersions.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(ok({ designId: 'd2', items: [summary(1)] }));
        }),
    );
    rerender({ id: 'd2' });
    await waitFor(() => expect(result.current.state.status).toBe('loading'));
    expect(result.current.state.versions).toEqual([]);
    await act(async () => release?.());
    expect(result.current.state.versions).toHaveLength(1);
  });

  it('échec de la liste : failed avec le problème', async () => {
    const { deps, designs } = setup();
    designs.listVersions.mockResolvedValue(err(problem));
    const { result } = renderHook(() => useDesignHistory(deps, model(1)));
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    expect(result.current.state.problem).toEqual(problem);
  });

  it('une promesse qui rejette devient un problème réseau', async () => {
    const { deps, designs } = setup();
    designs.listVersions.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDesignHistory(deps, model(1)));
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    expect(result.current.state.problem?.type).toBe('/problems/network');
  });

  it('resume rend le formulaire de la version', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    let form: Awaited<ReturnType<typeof result.current.actions.resume>> | undefined;
    await act(async () => {
      form = await result.current.actions.resume(3);
    });
    expect(designs.getVersion).toHaveBeenCalledWith('d1', 3);
    expect(form?.isOk() && form.value.garmentType).toBe('straight-skirt');
    expect(form?.isOk() && form.value.measurementsCm.statureMm).toBe(165);
    expect(result.current.state.resume.status).toBe('idle');
  });

  it('resume : un changement de modèle pendant la lecture rend stale, rien n’est appliqué', async () => {
    const { deps, designs } = setup();
    let release: () => void = () => undefined;
    designs.getVersion.mockImplementationOnce(
      (_id, n) => new Promise((resolve) => (release = () => resolve(ok(fullVersion(n))))),
    );
    const { result, rerender } = renderHook(({ id }) => useDesignHistory(deps, model(1, id)), {
      initialProps: { id: 'd1' },
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    let outcome: Awaited<ReturnType<typeof result.current.actions.resume>> | undefined;
    act(() => {
      void result.current.actions.resume(1).then((r) => (outcome = r));
    });
    rerender({ id: 'd2' });
    await act(async () => release());
    expect(outcome?.isErr() && outcome.error.type).toBe('/problems/stale');
    expect(result.current.state.resume.status).toBe('idle');
  });

  it('resume en échec : failed avec le problème, rien n’est rendu', async () => {
    const { deps, designs } = setup();
    designs.getVersion.mockResolvedValue(err(problem));
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    let outcome: Awaited<ReturnType<typeof result.current.actions.resume>> | undefined;
    await act(async () => {
      outcome = await result.current.actions.resume(3);
    });
    expect(outcome?.isErr()).toBe(true);
    expect(result.current.state.resume).toEqual({ status: 'failed', versionNumber: 3, problem });
  });

  it('compare : différences du service et aires par pièce', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.actions.compare(1, 2));
    expect(result.current.state.comparison.status).toBe('working');
    await waitFor(() => expect(result.current.state.comparison.status).toBe('ready'));
    expect(designs.getVersionChanges).toHaveBeenCalledWith('d1', 2, 1);
    const comparison = result.current.state.comparison.result;
    expect(comparison?.changes.params).toEqual([{ path: 'lengthMm', from: 600, to: 650 }]);
    expect([comparison?.fromNumber, comparison?.toNumber]).toEqual([1, 2]);
    expect(comparison?.panels[0]?.from?.areaMm2).toBeCloseTo(25000, 6);
    expect(comparison?.panels[0]?.areaDeltaMm2).toBeCloseTo(5000, 6);
    act(() => result.current.actions.clearComparison());
    expect(result.current.state.comparison).toEqual({ status: 'idle' });
  });

  it('compare en échec : failed avec le problème', async () => {
    const { deps, designs } = setup();
    designs.getVersionChanges.mockResolvedValue(err(problem));
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.actions.compare(1, 2));
    await waitFor(() => expect(result.current.state.comparison.status).toBe('failed'));
    expect(result.current.state.comparison.problem).toEqual(problem);
  });

  it('n’écrit rien dans le stockage du navigateur', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const { deps } = setup();
    const { result } = renderHook(() => useDesignHistory(deps, model(25)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      await result.current.actions.resume(3);
    });
    act(() => result.current.actions.compare(1, 2));
    await waitFor(() => expect(result.current.state.comparison.status).toBe('ready'));
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.length + sessionStorage.length).toBe(0);
    writes.mockRestore();
  });
});
