import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { usePatternStudio } from '../src/pattern-studio/use-pattern-studio.js';
import { fakeDesigns, fakeMannequin } from './fakes.js';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('modèle de vue de l’atelier de patron', () => {
  it('calcule le patron et ajuste le mannequin pour la saisie', async () => {
    const deps = { designs: fakeDesigns(), loadMannequin: async () => fakeMannequin() };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    expect(result.current.state.status).toBe('idle');
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.layout?.panels).toHaveLength(2);
    expect(result.current.state.mannequin?.measuredMm.chest).toBe(880);
    expect(result.current.state.versionNumber).toBe(1);
  });

  it('montre le problème rendu par le service et garde le mannequin', async () => {
    const problem = {
      type: '/problems/pattern-impossible',
      title: 'pattern impossible',
      status: 422,
    };
    const deps = { designs: fakeDesigns(problem), loadMannequin: async () => fakeMannequin() };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.generate());
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    expect(result.current.state.problem?.type).toBe('/problems/pattern-impossible');
    expect(result.current.state.mannequin).toBeDefined();
  });

  it('ne lance rien tant que la saisie est invalide', () => {
    const deps = { designs: fakeDesigns(), loadMannequin: async () => fakeMannequin() };
    const { result } = renderHook(() => usePatternStudio(deps), { wrapper });
    act(() => result.current.actions.setMeasurement('hipGirthMm', 5));
    act(() => result.current.actions.generate());
    expect(result.current.state.errors.hipGirthMm).toBeDefined();
    expect(result.current.state.status).toBe('idle');
  });
});
