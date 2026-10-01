import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { usePatternStudio } from '../src/pattern-studio/use-pattern-studio.js';
import type { MannequinFitter } from '../src/pattern-studio/fitter.js';
import { designName, fakeDesigns, fakeMannequin, fittedBody } from './fakes.js';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('modèle de vue de l’atelier de patron', () => {
  it('calcule le patron et ajuste le mannequin pour la saisie', async () => {
    const deps = { designs: fakeDesigns(), mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.mannequinStatus).toBe('idle');
    act(() => result.current.actions.generate());
    expect(result.current.state.mannequinStatus).toBe('fitting');
    expect(result.current.state.status).toBe('working');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.layout?.panels).toHaveLength(2);
    expect(result.current.state.mannequinStatus).toBe('ready');
    expect(result.current.state.mannequin?.measuredMm.chest).toBe(880);
    expect(result.current.state.versionNumber).toBe(1);
  });

  it('montre le problème rendu par le service et garde le mannequin', async () => {
    const problem = {
      type: '/problems/pattern-impossible',
      title: 'pattern impossible',
      status: 422,
    };
    const deps = { designs: fakeDesigns(problem), mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    expect(result.current.state.problem?.type).toBe('/problems/pattern-impossible');
    expect(result.current.state.mannequin).toBeDefined();
  });

  it('ne lance rien tant que la saisie est invalide', () => {
    const deps = { designs: fakeDesigns(), mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.setMeasurement('hipGirthMm', 5));
    act(() => result.current.actions.generate());
    expect(result.current.state.errors.hipGirthMm).toBeDefined();
    expect(result.current.state.status).toBe('idle');
  });

  it('ignore la réponse périmée d’un ajustement quand une demande plus récente a abouti', async () => {
    const pending: Array<(m: ReturnType<typeof fittedBody>) => void> = [];
    const fitter: MannequinFitter = {
      fit: () => new Promise((resolve) => pending.push(resolve)),
    };
    const deps = { designs: fakeDesigns(), mannequin: fitter, designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.generate());
    act(() => result.current.actions.setMeasurement('chestGirthMm', 100));
    act(() => result.current.actions.generate());
    await act(async () => pending[1]?.(fittedBody(1000)));
    await act(async () => pending[0]?.(fittedBody(880)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.mannequin?.measuredMm.chest).toBe(1000);
    expect(result.current.state.versionNumber).toBe(2);
  });

  it('état d’erreur du mannequin : le patron reste calculé', async () => {
    const fitter: MannequinFitter = { fit: () => Promise.reject(new Error('worker')) };
    const deps = { designs: fakeDesigns(), mannequin: fitter, designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.mannequinStatus).toBe('failed'));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.mannequin).toBeUndefined();
    expect(result.current.state.layout?.panels).toHaveLength(2);
  });

  it('garde le choix de vue 3D ou silhouettes', () => {
    const deps = { designs: fakeDesigns(), mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    expect(result.current.state.display).toBe('3d');
    act(() => result.current.actions.setDisplay('outline'));
    expect(result.current.state.display).toBe('outline');
  });

  it('un ajusteur qui cesse de répondre ne bloque plus l’écran une fois rejeté', async () => {
    let reject: (e: Error) => void = () => undefined;
    const fitter: MannequinFitter = { fit: () => new Promise((_, r) => (reject = r)) };
    const deps = { designs: fakeDesigns(), mannequin: fitter, designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.versionNumber).toBe(1));
    expect(result.current.state.status).toBe('working');
    await act(async () => reject(new Error('worker timeout')));
    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.mannequinStatus).toBe('failed');
  });
});

describe('choix du type de vêtement', () => {
  it('changer de type garde la saisie de chaque type et efface le patron', async () => {
    const deps = { designs: fakeDesigns(), mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.setParam('lengthMm', 75));
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.actions.setGarmentType('circle-skirt'));
    expect(result.current.state.form.garmentType).toBe('circle-skirt');
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.layout).toBeUndefined();
    expect(result.current.state.mannequin).toBeDefined();
    act(() => result.current.actions.setParam('circleFraction', 0.5));
    act(() => result.current.actions.setGarmentType('straight-skirt'));
    expect(result.current.state.form.paramsByType['straight-skirt']?.lengthMm).toBe(75);
    expect(result.current.state.form.paramsByType['circle-skirt']?.circleFraction).toBe(0.5);
  });

  it('un type non tracé ne se choisit pas', () => {
    const deps = { designs: fakeDesigns(), mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.setGarmentType('bodice'));
    expect(result.current.state.form.garmentType).toBe('straight-skirt');
  });

  it('un modèle par type : deux types, deux createDesign nommés par designName', async () => {
    const designs = fakeDesigns();
    const deps = { designs, mannequin: fakeMannequin(), designName };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.versionNumber).toBe(1));
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.versionNumber).toBe(2));
    act(() => result.current.actions.setGarmentType('trousers'));
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.versionNumber).toBe(3));
    expect(designs.created).toEqual([
      { name: 'Modèle straight-skirt', garmentType: 'straight-skirt' },
      { name: 'Modèle trousers', garmentType: 'trousers' },
    ]);
    const [first, second, third] = designs.versionDesignIds;
    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });
});
