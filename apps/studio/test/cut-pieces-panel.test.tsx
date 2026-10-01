import type { CutPiecesActions, CutPiecesLayout, CutPiecesState } from '@atelier/features';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CutPiecesPanel } from '../src/screens/pattern-studio/cut-pieces-panel.js';

const piece = (id: string, name: string, quantity: number, cutOnFold: boolean) => ({
  id,
  cutPath: 'M 0.0 10.0 L 100.0 10.0 L 50.0 0.0 Z',
  seamPath: 'M 5.0 10.0 L 95.0 10.0',
  notchesPath: '',
  grainPath: 'M 50.0 8.0 L 50.0 2.0',
  ...(cutOnFold ? { foldPath: 'M 0.0 10.0 L 0.0 0.0' } : {}),
  labelAt: [50, 6] as [number, number],
  label: { name, quantity, cutOnFold },
});
const layout: CutPiecesLayout = {
  viewBox: '-10 -10 260 40',
  pieces: [piece('front', 'Devant', 1, true), piece('back', 'Dos', 2, false)],
};

const idleExports = {
  svg: { status: 'idle' },
  'pdf-a4-tiled': { status: 'idle' },
  'dxf-aama': { status: 'idle' },
} as const;
const ready: CutPiecesState = {
  status: 'ready',
  layout,
  exports: idleExports,
};
const actions = (): CutPiecesActions => ({ download: vi.fn() });
const problem = (type: string) => ({ type, title: 'x', status: 422 });

describe('panneau des pièces de coupe', () => {
  it('repos : aucun panneau', () => {
    const { container } = render(
      <CutPiecesPanel state={{ status: 'idle', exports: idleExports }} actions={actions()} />,
    );
    expect(container.textContent).toBe('');
  });

  it('calcul : message d’attente', () => {
    render(
      <CutPiecesPanel state={{ status: 'working', exports: idleExports }} actions={actions()} />,
    );
    expect(screen.getByRole('status').textContent).toBe('Calcul des pièces de coupe…');
  });

  it('prêt : dessin, étiquettes, pliure, boutons de téléchargement', async () => {
    const a = actions();
    render(<CutPiecesPanel state={ready} actions={a} />);
    expect(screen.getByText('2 pièces de coupe')).toBeTruthy();
    const drawing = screen.getByRole('img', { name: 'Pièces de coupe' });
    expect(drawing.querySelectorAll('.studio-cut-line')).toHaveLength(2);
    expect(screen.getByText('Devant · couper 1', { exact: false })).toBeTruthy();
    expect(screen.getByText('Dos · couper 2')).toBeTruthy();
    expect(screen.getAllByText('sur la pliure')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'PDF A4 à assembler' }));
    expect(a.download).toHaveBeenCalledWith('pdf-a4-tiled');
    expect(screen.getByRole('button', { name: 'SVG 1:1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'DXF-AAMA' })).toBeTruthy();
  });

  it('échec : problème traduit en alerte', () => {
    const state: CutPiecesState = {
      status: 'failed',
      exports: idleExports,
      problem: problem('/problems/allowance-on-fold'),
    };
    render(<CutPiecesPanel state={state} actions={actions()} />);
    expect(screen.getByRole('alert').textContent).toBe(
      'Une valeur de couture est demandée sur une pliure.',
    );
  });

  it('export en cours : le bouton est désactivé', () => {
    const state = { ...ready, exports: { ...idleExports, 'dxf-aama': { status: 'working' } } };
    render(<CutPiecesPanel state={state as CutPiecesState} actions={actions()} />);
    expect(screen.getByRole('button', { name: 'DXF-AAMA' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'SVG 1:1' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('Préparation du fichier…')).toBeTruthy();
  });

  it('format indisponible : message traduit', () => {
    const state = {
      ...ready,
      exports: {
        ...idleExports,
        svg: { status: 'failed', problem: problem('/problems/export-format-unavailable') },
      },
    };
    render(<CutPiecesPanel state={state as CutPiecesState} actions={actions()} />);
    expect(screen.getByRole('alert').textContent).toBe('Ce format n’est pas encore disponible.');
  });
});
