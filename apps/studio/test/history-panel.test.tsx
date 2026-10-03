import type { DesignHistoryState, VersionComparison } from '@atelier/features';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HistoryPanel } from '../src/screens/pattern-studio/history-panel.js';

const summary = (number: number): DesignHistoryState['versions'][number] => ({
  number,
  createdAt: '2026-09-30T10:00:00.000Z',
  fingerprint: String(number).repeat(64).slice(0, 64),
  engineVersion: '0.1.0',
  garment: { type: 'straight-skirt', params: { lengthMm: 600 + number * 10 } },
});
const problem = (type: string) => ({ type, title: 'x', status: 404 });

const ready = (over: Partial<DesignHistoryState> = {}): DesignHistoryState => ({
  status: 'ready',
  versions: [summary(3), summary(2), summary(1)],
  hasMore: false,
  loadingMore: false,
  resume: { status: 'idle' },
  comparison: { status: 'idle' },
  ...over,
});
const actions = () => ({
  loadMore: vi.fn(),
  resume: vi.fn(),
  compare: vi.fn(),
  clearComparison: vi.fn(),
});
const panel = (state: DesignHistoryState, a = actions(), currentNumber: number | undefined = 3) =>
  render(<HistoryPanel state={state} actions={a} currentNumber={currentNumber} />);

const comparison: VersionComparison = {
  designId: 'd1',
  fromNumber: 2,
  toNumber: 3,
  changes: {
    designId: 'd1',
    from: summary(2),
    to: summary(3),
    sameFingerprint: false,
    params: [{ path: 'lengthMm', from: 620, to: 630 }],
    measurements: [{ name: 'waistGirthMm', from: 700, to: 720 }],
  },
  panels: [
    {
      id: 'front',
      name: 'Devant',
      from: { id: 'front', name: 'Devant', areaMm2: 150000, perimeterMm: 1600 },
      to: { id: 'front', name: 'Devant', areaMm2: 165000, perimeterMm: 1650 },
      areaDeltaMm2: 15000,
      perimeterDeltaMm: 50,
    },
    {
      id: 'belt',
      name: 'Ceinture',
      to: { id: 'belt', name: 'Ceinture', areaMm2: 20000, perimeterMm: 900 },
    },
    {
      id: 'back',
      name: 'Dos',
      from: { id: 'back', name: 'Dos', areaMm2: 150000, perimeterMm: 1600 },
    },
  ],
};

describe('panneau de l’historique', () => {
  it('sans modèle : aucun panneau', () => {
    const { container } = panel({ ...ready(), status: 'idle', versions: [] });
    expect(container.textContent).toBe('');
  });

  it('chargement : message d’attente', () => {
    panel({ ...ready(), status: 'loading', versions: [] });
    expect(screen.getByRole('status').textContent).toBe('Chargement de l’historique…');
  });

  it('liste : numéro, date, vêtement, résumé, version courante marquée, sans mesures', () => {
    panel(ready());
    const items = document.querySelectorAll<HTMLElement>('.studio-history-item');
    expect(items).toHaveLength(3);
    const first = within(items[0] as HTMLElement);
    expect(first.getByText('Version 3')).toBeTruthy();
    expect(first.getByText('version courante')).toBeTruthy();
    expect(first.getByText(/30 sept\. 2026/)).toBeTruthy();
    expect(first.getByText('Jupe droite')).toBeTruthy();
    expect(first.getByText('Longueur : 63 cm')).toBeTruthy();
    expect(screen.getAllByText('version courante')).toHaveLength(1);
    expect(screen.queryByText(/Tour de taille/)).toBeNull();
  });

  it('charger plus : bouton présent seulement s’il reste des versions', async () => {
    const a = actions();
    const { rerender } = panel(ready(), a);
    expect(screen.queryByRole('button', { name: 'Charger plus de versions' })).toBeNull();
    rerender(<HistoryPanel state={ready({ hasMore: true })} actions={a} currentNumber={3} />);
    await userEvent.click(screen.getByRole('button', { name: 'Charger plus de versions' }));
    expect(a.loadMore).toHaveBeenCalledOnce();
  });

  it('échec de la liste : problème traduit en alerte', () => {
    panel({ ...ready(), status: 'failed', versions: [], problem: problem('/problems/network') });
    expect(screen.getByRole('alert').textContent).toBe(
      'Le service est injoignable. Vérifiez qu’il est démarré.',
    );
  });

  it('reprendre : appelle l’action avec le numéro', async () => {
    const a = actions();
    panel(ready(), a);
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre la version 2' }));
    expect(a.resume).toHaveBeenCalledWith(2);
  });

  it('reprise en cours et en échec', () => {
    const { rerender } = panel(ready({ resume: { status: 'working', versionNumber: 2 } }));
    expect(screen.getByText('Reprise de la version 2…')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Reprendre la version 1' }).hasAttribute('disabled'),
    ).toBe(true);
    rerender(
      <HistoryPanel
        state={ready({
          resume: { status: 'failed', versionNumber: 2, problem: problem('/problems/network') },
        })}
        actions={actions()}
        currentNumber={3}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('injoignable');
  });

  it('comparer : par défaut la précédente et la courante ; choix modifiable', async () => {
    const a = actions();
    panel(ready(), a);
    const group = screen.getByRole('group', { name: 'Comparer deux versions' });
    await userEvent.click(within(group).getByRole('button', { name: 'Comparer' }));
    expect(a.compare).toHaveBeenLastCalledWith(2, 3);
    await userEvent.selectOptions(within(group).getByLabelText('Version de référence'), '1');
    await userEvent.click(within(group).getByRole('button', { name: 'Comparer' }));
    expect(a.compare).toHaveBeenLastCalledWith(1, 3);
  });

  it('une seule version : pas de comparaison', () => {
    panel(ready({ versions: [summary(1)] }), actions(), 1);
    expect(screen.queryByRole('group', { name: 'Comparer deux versions' })).toBeNull();
  });

  it('comparaison prête : changements, écarts signés, pièces ajoutée et retirée', async () => {
    const a = actions();
    panel(ready({ comparison: { status: 'ready', result: comparison } }), a);
    expect(screen.getByText('Version 2 comparée à la version 3')).toBeTruthy();
    expect(screen.getByText('Longueur : 62 cm → 63 cm')).toBeTruthy();
    expect(screen.getByText('Tour de taille : 70 cm → 72 cm')).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Pièces' });
    const front = within(table).getByRole('row', { name: /^Devant/ });
    const text = (front.textContent ?? '').replace(/\s/g, ' ');
    expect(text).toContain('1 500 cm²');
    expect(text).toContain('+150 cm²');
    expect(text).toContain('+5 cm');
    expect(within(table).getByRole('row', { name: /Ceinture \(ajoutée\)/ })).toBeTruthy();
    expect(within(table).getByRole('row', { name: /Dos \(retirée\)/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la comparaison' }));
    expect(a.clearComparison).toHaveBeenCalledOnce();
  });

  it('même empreinte : message, sans changements', () => {
    const same = {
      ...comparison,
      changes: { ...comparison.changes, sameFingerprint: true, params: [], measurements: [] },
    };
    panel(ready({ comparison: { status: 'ready', result: same } }));
    expect(screen.getByText(/même empreinte/)).toBeTruthy();
  });

  it('comparaison en cours puis en échec', () => {
    const { rerender } = panel(ready({ comparison: { status: 'working' } }));
    expect(screen.getByText('Comparaison en cours…')).toBeTruthy();
    rerender(
      <HistoryPanel
        state={ready({ comparison: { status: 'failed', problem: problem('/problems/network') } })}
        actions={actions()}
        currentNumber={3}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('injoignable');
  });

  it('changements de clé inconnue : une ligne chacun, sans avertissement de clé React', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const changes = {
      ...comparison.changes,
      params: [
        { path: 'futureAMm', from: 1, to: 2 },
        { path: 'futureBMm', from: 1, to: 2 },
      ],
    };
    panel(ready({ comparison: { status: 'ready', result: { ...comparison, changes } } }));
    expect(screen.getAllByText(/^Autre paramètre/)).toHaveLength(2);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
