import {
  finishedFields,
  initialForm,
  type FinishedField,
  type PatternStudioActions,
  type PatternStudioState,
} from '@atelier/features';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { easeCm } from '../src/screens/pattern-studio/finished-format.js';
import { PatternStudioView } from '../src/screens/pattern-studio/view.js';

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

const stateOf = (finished: FinishedField[], errors = {}): PatternStudioState => ({
  form: initialForm,
  finished,
  errors,
  status: 'idle',
  mannequinStatus: 'idle',
  display: '3d',
  dressing: { status: 'idle' },
  showGarment: false,
  dirty: false,
  runs: 0,
});

const auto = finishedFields(initialForm, {});
const edited = (key: string): FinishedField[] =>
  auto.map((f) => (f.key === key ? { ...f, valueCm: 80, source: 'manual' as const } : f));

describe('mesures finies du panneau Vêtement', () => {
  it('pré-remplit les champs en cm, repère « calculé », aisance en information', () => {
    render(<PatternStudioView state={stateOf(auto)} actions={actions()} />);
    const waist = auto.find((f) => f.key === 'waistGirthMm');
    expect(waist?.valueCm).toBeDefined();
    const input = screen.getByLabelText('Tour de taille fini') as HTMLInputElement;
    expect(input.value).toBe(String(waist?.valueCm));
    expect(screen.getByLabelText('Longueur finie')).toBeTruthy();
    expect(screen.getAllByText('calculé').length).toBe(auto.length);
    expect(screen.getAllByText(/aisance : \+/).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Aisance taille')).toBeNull();
    expect(screen.queryByRole('button', { name: /Recalculer Tour/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tout recalculer' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('saisie : transmise en cm au modèle de vue', async () => {
    const a = actions();
    render(<PatternStudioView state={stateOf(auto)} actions={a} />);
    await userEvent.type(screen.getByLabelText('Longueur finie'), '1');
    expect(a.setFinished).toHaveBeenCalledWith('lengthMm', expect.any(Number));
  });

  it('champ modifié : repère « modifié » et recalcul par champ ou pour tout', async () => {
    const a = actions();
    render(<PatternStudioView state={stateOf(edited('hipGirthMm'))} actions={a} />);
    expect(screen.getAllByText('modifié')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Recalculer Tour de bassin fini' }));
    expect(a.recalculateFinished).toHaveBeenCalledWith('hipGirthMm');
    await userEvent.click(screen.getByRole('button', { name: 'Tout recalculer' }));
    expect(a.recalculateFinished).toHaveBeenLastCalledWith();
  });

  it('erreur d’aisance : bornes affichées en cm', () => {
    const error = { code: 'easeRange', minMm: 20, maxMm: 300 } as const;
    const state = stateOf(auto, { 'finished.waistGirthMm': error });
    const fields = auto.map((f) => (f.key === 'waistGirthMm' ? { ...f, error } : f));
    render(<PatternStudioView state={{ ...state, finished: fields }} actions={actions()} />);
    expect(screen.getByRole('alert').textContent).toMatch(
      /^Aisance attendue entre 2\s+cm et 30\s+cm$/,
    );
    expect(screen.getByLabelText('Tour de taille fini').getAttribute('aria-invalid')).toBe('true');
  });

  it('mesures facultatives du corps : hauteur de taille proposée', () => {
    render(<PatternStudioView state={stateOf(auto)} actions={actions()} />);
    expect(screen.getByLabelText('Hauteur de taille')).toBeTruthy();
  });
});

describe('easeCm', () => {
  const field: FinishedField = { key: 'hipGirthMm', valueCm: 102, source: 'auto' };
  it('mesure finie moins corps, arrondie au mm', () => {
    expect(easeCm(field, { hipGirthMm: 96 })).toBe(6);
    expect(easeCm({ ...field, valueCm: 96.3 }, { hipGirthMm: 96 })).toBe(0.3);
  });
  it('absente pour une longueur, sans valeur ou sans mesure du corps', () => {
    expect(easeCm({ ...field, key: 'lengthMm' }, { hipGirthMm: 96 })).toBeUndefined();
    expect(easeCm({ ...field, valueCm: undefined }, { hipGirthMm: 96 })).toBeUndefined();
    expect(easeCm(field, {})).toBeUndefined();
  });
});
