import { initialForm, type PatternStudioActions, type PatternStudioState } from '@atelier/features';
import type { FittedMannequin } from '@atelier/mannequin';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PatternStudioView } from '../src/screens/pattern-studio/view.js';

vi.mock('@atelier/viewer3d', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  MannequinView: () => <div data-testid="mannequin-3d" />,
}));

const box = {
  positions: Float32Array.from([
    0, 0, 0, 10, 0, 0, 10, 60, 0, 0, 60, 0, 0, 0, 10, 10, 0, 10, 10, 60, 10, 0, 60, 10,
  ]),
  normals: new Float32Array(24),
  index: Uint32Array.from([
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7, 1, 5, 6, 1, 6, 2, 0, 3,
    7, 0, 7, 4,
  ]),
};
const fitted: FittedMannequin = {
  body: box,
  measuredMm: {},
  landmarksMm: { crotch: 780, hip: 900, waist: 1050, neck: 1400, knee: 480, ankle: 80 },
};

const actions = (): PatternStudioActions => ({
  setDisplay: vi.fn(),
  setSex: vi.fn(),
  setMeasurement: vi.fn(),
  setSkirt: vi.fn(),
  generate: vi.fn(),
});

const base: PatternStudioState = {
  form: initialForm,
  errors: {},
  status: 'idle',
  mannequinStatus: 'idle',
  display: '3d',
};
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
    expect(screen.getByText('1 pièce')).toBeTruthy();
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
        state={{ ...base, errors: { hipGirthMm: { code: 'range', minMm: 600, maxMm: 1900 } } }}
        actions={actions()}
      />,
    );
    expect(screen.getByLabelText('Tour de bassin').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Entre 60 cm et 190 cm');
  });

  it('ajustement en cours : indique « en cours » et garde l’écran utilisable', () => {
    render(
      <PatternStudioView
        state={{ ...base, status: 'working', mannequinStatus: 'fitting' }}
        actions={actions()}
      />,
    );
    expect(screen.getByText('Ajustement du mannequin en cours…')).toBeTruthy();
    for (const name of ['3D', 'Silhouettes']) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(false);
    }
    expect(screen.getByLabelText('Tour de bassin').hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Longueur').hasAttribute('disabled')).toBe(false);
  });

  it('ajustement échoué : message traduit et bouton de calcul de nouveau actif', () => {
    render(
      <PatternStudioView state={{ ...base, mannequinStatus: 'failed' }} actions={actions()} />,
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'Le mannequin n’a pas pu être ajusté. Le patron reste valable.',
    );
    expect(
      screen.getByRole('button', { name: 'Calculer le patron' }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('bascule 3D : affiche la vue 3D, pas les silhouettes', async () => {
    render(
      <PatternStudioView
        state={{ ...base, mannequin: fitted, mannequinStatus: 'ready' }}
        actions={actions()}
      />,
    );
    expect(await screen.findByTestId('mannequin-3d')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Face' })).toBeNull();
  });

  it('bascule silhouettes : trois svg avec libellés traduits', () => {
    render(
      <PatternStudioView
        state={{ ...base, mannequin: fitted, mannequinStatus: 'ready', display: 'outline' }}
        actions={actions()}
      />,
    );
    for (const name of ['Face', 'Profil', 'Dos']) {
      expect(screen.getByRole('img', { name }).tagName.toLowerCase()).toBe('svg');
    }
    expect(screen.queryByTestId('mannequin-3d')).toBeNull();
  });

  it('la bascule transmet le choix au modèle de vue', async () => {
    const a = actions();
    render(<PatternStudioView state={base} actions={a} />);
    await userEvent.click(screen.getByRole('button', { name: 'Silhouettes' }));
    expect(a.setDisplay).toHaveBeenCalledWith('outline');
    expect(screen.getByRole('button', { name: '3D' }).getAttribute('aria-pressed')).toBe('true');
  });
});
