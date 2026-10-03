import { ok } from '@atelier/kernel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useStudioHistory } from '../src/design-history/use-studio-history.js';
import { toVersionRequest, initialForm } from '../src/pattern-studio/form.js';
import { usePatternStudio } from '../src/pattern-studio/use-pattern-studio.js';
import { designName, fakeDesigns, fakeMannequin, spec } from './fakes.js';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

function setup(confirm: (n: number) => boolean) {
  const designs = fakeDesigns();
  let release: () => void = () => undefined;
  const base = toVersionRequest(initialForm);
  if (base.isErr()) throw new Error('formulaire invalide');
  const full = (n: number) => ({
    ...base.value,
    designId: 'd1',
    number: n,
    createdAt: '2026-09-30T10:00:00.000Z',
    fingerprint: 'f'.repeat(64),
    spec,
  });
  Object.assign(designs, {
    listVersions: async () => ok({ designId: 'd1', items: [] }),
    getVersion: (_id: string, n: number) =>
      new Promise((resolve) => (release = () => resolve(ok(full(n))))),
  });
  const deps = { designs, mannequin: fakeMannequin(), designName };
  const hook = renderHook(
    () => {
      const studio = usePatternStudio(deps);
      return { studio, history: useStudioHistory({ designs }, studio, confirm) };
    },
    { wrapper },
  );
  return { hook, release: () => release() };
}

async function generated(confirm: (n: number) => boolean) {
  const env = setup(confirm);
  act(() => env.hook.result.current.studio.actions.generate());
  await waitFor(() => expect(env.hook.result.current.studio.state.status).toBe('ready'));
  return env;
}

describe('historique branché sur le studio', () => {
  it('la saisie modifiée pendant la lecture : confirmation sur l’état courant, refus = rien', async () => {
    const confirm = vi.fn(() => false);
    const { hook, release } = await generated(confirm);
    const before = hook.result.current.studio.state.form;
    let outcome: string | undefined;
    act(() => {
      void hook.result.current.history.actions.resume(1).then((r) => (outcome = r));
    });
    act(() => hook.result.current.studio.actions.setMeasurement('chestGirthMm', 100));
    await act(async () => release());
    await waitFor(() => expect(outcome).toBe('declined'));
    expect(confirm).toHaveBeenCalledWith(1);
    expect(hook.result.current.studio.state.form.measurementsCm.chestGirthMm).toBe(100);
    expect(hook.result.current.studio.state.form).not.toBe(before);
  });

  it('sans modification : pas de question, formulaire appliqué', async () => {
    const confirm = vi.fn(() => false);
    const { hook, release } = await generated(confirm);
    let outcome: string | undefined;
    act(() => {
      void hook.result.current.history.actions.resume(1).then((r) => (outcome = r));
    });
    await act(async () => release());
    await waitFor(() => expect(outcome).toBe('applied'));
    expect(confirm).not.toHaveBeenCalled();
    expect(hook.result.current.studio.state.status).toBe('idle');
  });

  it('un calcul lancé pendant la lecture abandonne la reprise', async () => {
    const confirm = vi.fn(() => true);
    const { hook, release } = await generated(confirm);
    let outcome: string | undefined;
    act(() => {
      void hook.result.current.history.actions.resume(1).then((r) => (outcome = r));
    });
    act(() => hook.result.current.studio.actions.setMeasurement('chestGirthMm', 100));
    act(() => hook.result.current.studio.actions.generate());
    await act(async () => release());
    await waitFor(() => expect(outcome).toBe('superseded'));
    expect(confirm).not.toHaveBeenCalled();
    expect(hook.result.current.studio.state.form.measurementsCm.chestGirthMm).toBe(100);
  });

  it('le modèle change pendant la lecture : stale, rien n’est appliqué', async () => {
    const confirm = vi.fn(() => true);
    const { hook, release } = await generated(confirm);
    let outcome: string | undefined;
    const firstId = hook.result.current.studio.state.designId;
    act(() => {
      void hook.result.current.history.actions.resume(1).then((r) => (outcome = r));
    });
    act(() => hook.result.current.studio.actions.setGarmentType('circle-skirt'));
    act(() => hook.result.current.studio.actions.generate());
    await waitFor(() => expect(hook.result.current.studio.state.designId).not.toBe(firstId));
    await waitFor(() => expect(hook.result.current.studio.state.designId).toBeDefined());
    await act(async () => release());
    await waitFor(() => expect(outcome).toBe('stale'));
    expect(hook.result.current.studio.state.form.garmentType).toBe('circle-skirt');
  });
});
