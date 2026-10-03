import {
  finishedFields,
  initialForm,
  type PatternStudioActions,
  type PatternStudioState,
} from '@atelier/features';
import type { FittedMannequin } from '@atelier/mannequin';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternStudioView } from '../src/screens/pattern-studio/view.js';

const mockedView = vi.hoisted(() => vi.fn());

vi.mock('@atelier/viewer3d', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  MannequinView: (props: unknown) => mockedView(props),
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
};

const actions = (): PatternStudioActions => ({
  setDisplay: vi.fn(),
  setSex: vi.fn(),
  setMeasurement: vi.fn(),
  setGarmentType: vi.fn(),
  setParam: vi.fn(),
  setWithSleeve: vi.fn(),
  setShowGarment: vi.fn(),
  setSleeveParam: vi.fn(),
  generate: vi.fn(),
  applyForm: vi.fn(),
  setFinished: vi.fn(),
  recalculateFinished: vi.fn(),
});

const base: PatternStudioState = {
  form: initialForm,
  finished: finishedFields(initialForm, {}),
  errors: {},
  status: 'idle',
  mannequinStatus: 'idle',
  display: '3d',
  dressing: { status: 'idle' },
  showGarment: true,
  dirty: false,
  runs: 0,
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

beforeEach(() => mockedView.mockImplementation(() => <div data-testid="mannequin-3d" />));

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
    expect(screen.getByLabelText('Longueur finie').hasAttribute('disabled')).toBe(false);
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

  it('le sélecteur liste les quatre types, tous tracés', () => {
    render(<PatternStudioView state={base} actions={actions()} />);
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Jupe droite', 'Jupe cercle', 'Pantalon', 'Corsage']),
    );
    expect(options.some((o) => o.hasAttribute('disabled'))).toBe(false);
  });

  it('corsage : mesures de buste, champs du corsage, manches en option', async () => {
    const a = actions();
    const form = { ...initialForm, garmentType: 'bodice' as const };
    const { rerender } = render(
      <PatternStudioView
        state={{ ...base, form, finished: finishedFields(form, {}) }}
        actions={a}
      />,
    );
    expect(screen.getByLabelText('Tour de buste')).toBeTruthy();
    expect(screen.getByLabelText('Longueur taille dos')).toBeTruthy();
    expect(screen.getByLabelText('Tour de buste fini')).toBeTruthy();
    expect(screen.queryByLabelText('Aisance poitrine')).toBeNull();
    expect(screen.queryByLabelText('Longueur de manche finie')).toBeNull();
    await userEvent.click(screen.getByLabelText('Avec manches'));
    expect(a.setWithSleeve).toHaveBeenCalledWith(true);
    const sleeveErrors = { 'sleeve.lengthMm': { code: 'range', minMm: 100, maxMm: 900 } } as const;
    rerender(
      <PatternStudioView
        state={{
          ...base,
          form: { ...form, withSleeve: true },
          finished: finishedFields({ ...form, withSleeve: true }, sleeveErrors),
          errors: sleeveErrors,
        }}
        actions={a}
      />,
    );
    expect(screen.getByLabelText('Longueur de manche finie').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getByLabelText('Embu de la tête de manche')).toBeTruthy();
    expect(screen.getByLabelText('Tour du bas de manche')).toBeTruthy();
  });

  it('choisir « Jupe cercle » appelle setGarmentType', async () => {
    const a = actions();
    render(<PatternStudioView state={base} actions={a} />);
    await userEvent.selectOptions(screen.getByLabelText('Vêtement'), 'circle-skirt');
    expect(a.setGarmentType).toHaveBeenCalledWith('circle-skirt');
  });

  it('les champs suivent le type : fraction de cercle, sans unité', async () => {
    const a = actions();
    const form = { ...initialForm, garmentType: 'circle-skirt' as const };
    render(<PatternStudioView state={{ ...base, form }} actions={a} />);
    expect(screen.getByLabelText('Fraction de cercle')).toBeTruthy();
    expect(screen.getByLabelText('Hauteur de ceinture')).toBeTruthy();
    expect(screen.queryByLabelText('Aisance bassin')).toBeNull();
    expect(screen.queryByLabelText('Hauteur d’entrejambe')).toBeNull();
    await userEvent.type(screen.getByLabelText('Fraction de cercle'), '5');
    expect(a.setParam).toHaveBeenCalledWith('circleFraction', 15);
  });

  it('pantalon : demande la hauteur d’entrejambe et le tour du bas de jambe', () => {
    const form = { ...initialForm, garmentType: 'trousers' as const };
    render(<PatternStudioView state={{ ...base, form }} actions={actions()} />);
    expect(screen.getByLabelText('Hauteur d’entrejambe')).toBeTruthy();
    expect(screen.getByLabelText('Tour du bas de jambe')).toBeTruthy();
  });

  it('erreur de ceinture : bornes dans l’unité du champ (cm)', () => {
    const form = { ...initialForm, garmentType: 'circle-skirt' as const };
    const errors = { waistbandWidthMm: { code: 'zeroOrRange', minMm: 20, maxMm: 80 } } as const;
    render(<PatternStudioView state={{ ...base, form, errors }} actions={actions()} />);
    expect(screen.getByRole('alert').textContent).toBe('0 ou entre 2 cm et 8 cm');
  });

  it('erreur de fraction : bornes sans unité', () => {
    const form = { ...initialForm, garmentType: 'circle-skirt' as const };
    const errors = { circleFraction: { code: 'ratioRange', min: 0.25, max: 1 } } as const;
    render(<PatternStudioView state={{ ...base, form, errors }} actions={actions()} />);
    expect(screen.getByRole('alert').textContent).toBe('Entre 0,25 et 1');
  });

  it('type non tracé rendu par le service : message traduit', () => {
    const problem = { type: '/problems/garment-type-not-supported', title: 'x', status: 422 };
    render(
      <PatternStudioView state={{ ...base, status: 'failed', problem }} actions={actions()} />,
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'Ce type de vêtement n’est pas encore tracé par le moteur.',
    );
  });
});
