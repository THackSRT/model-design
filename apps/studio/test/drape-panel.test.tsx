import { ENGINE_VERSION } from '@atelier/drape';
import { type CusickRun, type CusickRunner, useFabricBench } from '@atelier/features';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FabricBenchView } from '../src/screens/fabric-bench/view.js';
import { outlinePoints, VIEW_BOX } from '../src/screens/fabric-bench/drape-shape.js';

const saver = { save: vi.fn() };
const now = () => new Date('2026-05-01T09:00:00Z');

function Harness({ cusick }: { cusick?: CusickRunner }) {
  const { state, actions } = useFabricBench({ saver, now, ...(cusick ? { cusick } : {}) });
  const onImportFile = (file: File) => void file.text().then(actions.importReport);
  return <FabricBenchView state={state} actions={actions} onImportFile={onImportFile} />;
}

const SECTORS = 24;
const circle = (radiusMm: number): Float64Array => {
  const out = new Float64Array(2 * SECTORS);
  for (let i = 0; i < SECTORS; i += 1) {
    out[2 * i] = radiusMm * Math.cos((2 * Math.PI * i) / SECTORS);
    out[2 * i + 1] = radiusMm * Math.sin((2 * Math.PI * i) / SECTORS);
  }
  return out;
};
const run = (overrides: Partial<CusickRun> = {}): CusickRun => ({
  drapeCoefficient: 0.5,
  converged: true,
  simulatedSteps: 120,
  outlineMm: circle(120),
  engineVersion: ENGINE_VERSION,
  ...overrides,
});
const runnerOf = (impl: CusickRunner['run']) => ({ run: vi.fn(impl) });
const simulateButtons = () => screen.getAllByRole('button', { name: 'Simuler' });
const panel = () => within(screen.getByRole('region', { name: 'Drapé de Cusick simulé' }));

describe('panneau de drapé simulé : états', () => {
  it('sans runner : pas de panneau', () => {
    render(<Harness />);
    expect(screen.queryByRole('region', { name: 'Drapé de Cusick simulé' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simuler' })).toBeNull();
  });

  it('au repos : deux essais à lancer, rien de calculé', () => {
    render(<Harness cusick={runnerOf(async () => run())} />);
    expect(simulateButtons()).toHaveLength(2);
    expect(panel().getByText('Valeurs estimées')).toBeTruthy();
    expect(panel().getByText('Valeurs candidates')).toBeTruthy();
    expect(panel().getAllByText('Pas encore simulé.')).toHaveLength(2);
    expect(panel().queryByRole('img')).toBeNull();
  });

  it('en cours : message de calcul et bouton désactivé', async () => {
    render(<Harness cusick={runnerOf(() => new Promise(() => undefined))} />);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    expect(await panel().findByText('Calcul en cours…')).toBeTruthy();
    expect(
      (screen.getAllByRole('button', { name: /Simuler|Relancer/ })[0] as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('prêt : les deux ombres vues de dessus côte à côte, chacune avec son coefficient', async () => {
    const runner = { run: vi.fn<CusickRunner['run']>() };
    runner.run.mockResolvedValueOnce(run({ drapeCoefficient: 0.5 }));
    runner.run.mockResolvedValueOnce(run({ drapeCoefficient: 0.62 }));
    render(<Harness cusick={runner} />);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    const views = await panel().findAllByRole('img');
    expect(views).toHaveLength(2);
    expect(panel().getByText('Coefficient de drapé : 0,5')).toBeTruthy();
    expect(panel().getByText('Coefficient de drapé : 0,62')).toBeTruthy();
    expect(views[0]?.getAttribute('viewBox')).toBe(VIEW_BOX);
    expect(views[0]?.querySelector('polygon')?.getAttribute('points')).toBe(
      outlinePoints(circle(120)),
    );
    expect(views[0]?.querySelectorAll('circle')).toHaveLength(2);
    expect(panel().getAllByRole('button', { name: 'Relancer' })).toHaveLength(2);
    expect(runner.run).toHaveBeenCalledTimes(2);
  });

  it('la vue de dessus a un titre et une description accessibles', async () => {
    render(<Harness cusick={runnerOf(async () => run())} />);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    const view = await panel().findByRole('img', {
      name: /Ombre vue de dessus : Valeurs estimées/,
    });
    expect(view.getAttribute('aria-labelledby')?.split(' ')).toHaveLength(2);
    expect(view.querySelector('desc')?.textContent).toMatch(/disque de 180 mm.*300 mm/i);
  });

  it('non convergé : équilibre non atteint, coefficient indicatif', async () => {
    render(<Harness cusick={runnerOf(async () => run({ converged: false }))} />);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    expect(await panel().findByText(/Équilibre non atteint/)).toBeTruthy();
    expect(panel().getByText('Coefficient de drapé : 0,5')).toBeTruthy();
  });

  it('échec : message traduit annoncé', async () => {
    render(<Harness cusick={runnerOf(async () => Promise.reject(new Error('boom')))} />);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    const alert = await panel().findByRole('alert');
    expect(alert.textContent).toBe('La simulation a échoué. Vérifiez les valeurs et relancez.');
    expect(simulateButtons()).toHaveLength(2);
  });
});

describe('panneau de drapé simulé : drapé mesuré', () => {
  const measure = async (value: string) => {
    const field = screen.getByLabelText('Coefficient de drapé');
    await userEvent.clear(field);
    await userEvent.type(field, value);
  };

  it('conforme : dans la tolérance du coefficient simulé', async () => {
    render(<Harness cusick={runnerOf(async () => run({ drapeCoefficient: 0.5 }))} />);
    await measure('0.52');
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    expect(await panel().findByText(/Mesuré : 0,52 \(Conforme, à ± 0,05 près\)/)).toBeTruthy();
  });

  it('non conforme : hors de la tolérance', async () => {
    render(<Harness cusick={runnerOf(async () => run({ drapeCoefficient: 0.5 }))} />);
    await measure('0.8');
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    expect(await panel().findByText(/Mesuré : 0,8 \(Hors tolérance, à ± 0,05 près\)/)).toBeTruthy();
  });

  it('pas de ligne « Mesuré » tant que rien n’est saisi', async () => {
    render(<Harness cusick={runnerOf(async () => run())} />);
    await userEvent.click(simulateButtons()[0] as HTMLElement);
    await panel().findByRole('img');
    expect(panel().queryByText(/Mesuré :/)).toBeNull();
  });
});

describe('panneau de drapé simulé : essai relu d’un rapport', () => {
  it('coefficient affiché, ombre absente, invitation à relancer', async () => {
    const poplin = {
      weightGPerM2: 120,
      thicknessMm: 0.2,
      stretchWarpPercent: 2,
      stretchWeftPercent: 3,
      bendingRigidityMicroNm: 6,
      frictionCoefficient: 0.35,
    };
    const text = JSON.stringify({
      schemaVersion: '1.0',
      createdAt: '2026-05-01T08:00:00Z',
      updatedAt: '2026-05-01T09:00:00Z',
      engineVersion: ENGINE_VERSION,
      reviews: [
        {
          preset: 'cotton-poplin',
          verdict: 'validated',
          reviewedAt: '2026-05-01T09:00:00Z',
          estimated: poplin,
          simulatedDrape: {
            estimated: {
              fabric: poplin,
              drapeCoefficient: 0.41,
              converged: true,
              simulatedSteps: 90,
            },
          },
        },
      ],
    });
    render(<Harness cusick={runnerOf(async () => run())} />);
    await userEvent.upload(
      screen.getByTestId('ui-file-input'),
      new File([text], 'rapport.json', { type: 'application/json' }),
    );
    expect(await panel().findByText('Coefficient de drapé : 0,41')).toBeTruthy();
    expect(panel().getByRole('img').querySelector('polygon')).toBeNull();
    expect(panel().getByText(/contour de l’ombre n’est pas conservé/)).toBeTruthy();
  });
});

describe('contour de l’ombre', () => {
  it('rend des points « x,z » en mm, vides si le contour est absent ou incomplet', () => {
    expect(outlinePoints(Float64Array.of(1, 2, 3.14159, -4, 0, 0))).toBe(
      '1.0,2.0 3.1,-4.0 0.0,0.0',
    );
    expect(outlinePoints(new Float64Array(0))).toBe('');
    expect(outlinePoints(Float64Array.of(1, 2, 3, 4))).toBe('');
    expect(outlinePoints(Float64Array.of(1, 2, 3, 4, Number.NaN, 0))).toBe('');
  });
});
