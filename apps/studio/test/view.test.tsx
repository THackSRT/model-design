import { initialForm, type PatternStudioActions, type PatternStudioState } from '@atelier/features';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PatternStudioView } from '../src/screens/pattern-studio/view.js';

const actions = (): PatternStudioActions => ({
  setSex: vi.fn(),
  setMeasurement: vi.fn(),
  setSkirt: vi.fn(),
  generate: vi.fn(),
});

const base: PatternStudioState = { form: initialForm, errors: {}, status: 'idle' };
const layout = {
  viewBox: '0 0 100 100',
  panels: [
    {
      id: 'front',
      name: 'Devant',
      path: 'M 0 0 L 10 0 L 0 10 Z',
      labelAt: [5, 5] as [number, number],
    },
  ],
};

describe('vue de l’atelier de patron', () => {
  it('au repos : invite à saisir, et transmet les saisies au modèle de vue', async () => {
    const a = actions();
    render(<PatternStudioView state={base} actions={a} />);
    expect(screen.getByRole('status').textContent).toBe('Saisissez les mesures puis calculez.');
    await userEvent.click(screen.getByRole('button', { name: 'Calculer le patron' }));
    expect(a.generate).toHaveBeenCalledOnce();
  });

  it('en cours : le bouton est désactivé', () => {
    render(<PatternStudioView state={{ ...base, status: 'working' }} actions={actions()} />);
    expect(
      screen.getByRole('button', { name: 'Calculer le patron' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('prêt : dessine les pièces et affiche la version', () => {
    render(
      <PatternStudioView
        state={{ ...base, status: 'ready', layout, versionNumber: 3 }}
        actions={actions()}
      />,
    );
    expect(screen.getByRole('img', { name: 'Patron' }).querySelectorAll('path')).toHaveLength(1);
    expect(screen.getByText('Version 3')).toBeTruthy();
  });

  it('échec : traduit le problème rendu par le service', () => {
    const problem = {
      type: '/problems/pattern-impossible',
      title: 'pattern impossible',
      status: 422,
    };
    render(
      <PatternStudioView state={{ ...base, status: 'failed', problem }} actions={actions()} />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Patron impossible avec ces mesures.');
  });

  it('champ invalide : il est signalé', () => {
    render(
      <PatternStudioView
        state={{ ...base, errors: { hipGirthMm: 'entre 60 et 190 cm' } }}
        actions={actions()}
      />,
    );
    expect(screen.getByLabelText('Tour de bassin').getAttribute('aria-invalid')).toBe('true');
  });
});
