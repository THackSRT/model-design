import { initialForm, PRESET_NAMES, toVersionRequest } from '@atelier/features';
import { err, ok } from '@atelier/kernel';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drapeProblemMessage } from '../src/i18n/t.js';
import { DRAPE_PRESETS } from '../src/screens/pattern-studio/drape-fabrics.js';
import { PatternStudioScreen } from '../src/screens/pattern-studio/screen.js';

const fake = vi.hoisted(() => ({ client: {} as Record<string, unknown> }));
const mocked = vi.hoisted(() => ({ view: vi.fn(), read: vi.fn(), fit: vi.fn() }));

vi.mock('@atelier/features', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  createDesignsClient: () => fake.client,
}));
vi.mock('@atelier/viewer3d', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  MannequinView: (props: unknown) => mocked.view(props),
  readDrapedGlb: (buffer: ArrayBuffer) => mocked.read(buffer),
}));
vi.mock('../src/platform/mannequin.js', () => ({
  getMannequinFitter: () => ({
    fit: (measurements: unknown, options: unknown) => mocked.fit(measurements, options),
    dress: () => new Promise(() => undefined),
  }),
}));
vi.mock('../src/platform/download.js', () => ({ browserFileSaver: { save: vi.fn() } }));

const body = {
  positions: Float32Array.from([0, 0, 0, 10, 0, 0, 10, 60, 0]),
  normals: new Float32Array(9),
  index: Uint32Array.from([0, 1, 2]),
};
const spec = {
  specVersion: '1.0',
  unit: 'mm',
  engine: { name: 'patterning', version: '0.1.0' },
  garment: { type: 'straight-skirt' },
  panels: [
    {
      id: 'front',
      name: 'Devant',
      quantity: 1,
      edges: [
        { id: 'a', from: [0, 0], to: [250, 0] },
        { id: 'b', from: [250, 0], to: [250, 600] },
        { id: 'c', from: [250, 600], to: [0, 0] },
      ],
    },
  ],
  seams: [],
};
const stamp = { createdAt: '2026-09-30T10:00:00.000Z', fingerprint: 'f'.repeat(64) };

function version(number: number) {
  const base = toVersionRequest(initialForm);
  if (base.isErr()) throw new Error('formulaire invalide');
  const garment = { type: 'straight-skirt' as const, params: { lengthMm: 600 } };
  return { ...base.value, garment, designId: 'd1', number, ...stamp, spec };
}

const drape = (status: string, extra: object = {}) => ({
  id: 'dr1',
  status,
  createdAt: stamp.createdAt,
  ...extra,
});
const unused = { type: '/problems/unused', title: 'x', status: 500 };
const requestDrape = vi.fn();
const getDrape = vi.fn();
const getDrapeModel = vi.fn();
const layers = [{ positions: new Float32Array(9), normals: new Float32Array(0), index: [0, 1, 2] }];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  for (const mock of [requestDrape, getDrape, getDrapeModel, mocked.view, mocked.read, mocked.fit])
    mock.mockReset();
  mocked.fit.mockResolvedValue({ body, measuredMm: {}, landmarksMm: {}, armsMm: {} });
  mocked.view.mockImplementation(() => <div data-testid="mannequin-3d" />);
  mocked.read.mockReturnValue({ ok: true, layers });
  requestDrape.mockResolvedValue(ok(drape('pending')));
  getDrape.mockResolvedValue(ok(drape('completed')));
  getDrapeModel.mockResolvedValue(ok(new ArrayBuffer(8)));
  fake.client = {
    createDesign: async () => ok({ id: 'd1' }),
    createVersion: async () => ok(version(1)),
    listVersions: async () => err(unused),
    getVersion: async () => err(unused),
    getVersionChanges: async () => err(unused),
    cutPattern: async () => err(unused),
    exportFile: async () => err(unused),
    requestDrape,
    getDrape,
    getDrapeModel,
  };
});
afterEach(() => vi.useRealTimers());

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const drapeButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: 'Draper le vêtement' });
const lastDraped = () => mocked.view.mock.lastCall?.[0]?.draped as { layers: unknown } | undefined;

async function calculated() {
  const u = user();
  render(<PatternStudioScreen confirm={() => true} />);
  await u.click(screen.getByRole('button', { name: 'Calculer le patron' }));
  await screen.findByText('Version 1');
  return u;
}
const settle = () => vi.advanceTimersByTimeAsync(2000);

describe('panneau Drapé de l’onglet Patron', () => {
  it('repos : bouton désactivé sans version enregistrée', () => {
    render(<PatternStudioScreen confirm={() => true} />);
    expect(drapeButton().disabled).toBe(true);
  });

  it('bouton actif une fois la version enregistrée', async () => {
    await calculated();
    await waitFor(() => expect(drapeButton().disabled).toBe(false));
  });

  it('demande envoyée avec le tissu choisi, en brouillon, bras à 30°', async () => {
    const u = await calculated();
    await u.selectOptions(screen.getByLabelText('Tissu'), 'denim');
    await u.click(drapeButton());
    expect(requestDrape).toHaveBeenCalledWith('d1', 1, {
      fabric: { preset: 'denim' },
      avatar: { armAngleDeg: 30 },
      quality: 'draft',
    });
  });

  it('popeline par défaut', async () => {
    const u = await calculated();
    await u.click(drapeButton());
    expect(requestDrape.mock.calls[0]?.[2].fabric).toEqual({ preset: 'cotton-poplin' });
  });

  it('en cours puis prêt : vêtement drapé passé à la visionneuse, corps à 30°', async () => {
    const u = await calculated();
    await u.click(drapeButton());
    expect(await screen.findByText('Drapé en cours…')).toBeTruthy();
    expect(drapeButton().disabled).toBe(true);
    await settle();
    await screen.findByText(/Drapé prêt/);
    await waitFor(() => expect(lastDraped()?.layers).toBe(layers));
    expect(mocked.read).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(mocked.fit.mock.calls.at(-1)?.[1]).toEqual({ armAngleDeg: 30 });
  });

  it('préréglage estimé signalé', async () => {
    getDrape.mockResolvedValue(ok(drape('completed', { fabricEstimated: true })));
    const u = await calculated();
    await u.click(drapeButton());
    await settle();
    expect(await screen.findByText('Les valeurs de ce tissu sont des estimations.')).toBeTruthy();
  });

  it('revenir à l’habillage géométrique retire le drapé de la visionneuse', async () => {
    const u = await calculated();
    await u.click(drapeButton());
    await settle();
    await waitFor(() => expect(lastDraped()).toBeDefined());
    await u.click(screen.getByRole('button', { name: 'Montrer le drapé' }));
    await waitFor(() => expect(lastDraped()).toBeUndefined());
  });

  it.each([
    ['/problems/drape-placement-missing', /n’a pas de position/],
    ['/problems/drape-placement-failed', /placement des pièces/],
    ['/problems/drape-seam-not-closed', /couture/],
    ['/problems/drape-body-penetration', /traverse le corps/],
    ['/problems/drape-too-large', /trop grand/],
    ['/problems/drape-internal', /erreur interne/],
    ['/problems/drape-timeout', /trop de temps/],
    ['/problems/drape-inconnu', /Le drapé a échoué/],
  ])('échec %s : message traduit', async (problemType, text) => {
    getDrape.mockResolvedValue(ok(drape('failed', { problemType })));
    const u = await calculated();
    await u.click(drapeButton());
    await settle();
    expect(await screen.findByText(text)).toBeTruthy();
    expect(lastDraped()).toBeUndefined();
  });

  it('échec de la demande : message du problème HTTP', async () => {
    requestDrape.mockResolvedValue(err({ type: '/problems/network', title: 'x', status: 0 }));
    const u = await calculated();
    await u.click(drapeButton());
    expect(await screen.findByText(/Le service est injoignable/)).toBeTruthy();
  });

  it('GLB illisible : échec affiché, pas d’exception', async () => {
    mocked.read.mockReturnValue({ ok: false, error: { code: 'malformed', message: 'x' } });
    const u = await calculated();
    await u.click(drapeButton());
    await settle();
    expect(await screen.findByText('Le vêtement drapé n’a pas pu être lu.')).toBeTruthy();
  });

  it('mesures modifiées : le drapé affiché est retiré et le bouton désactivé', async () => {
    const u = await calculated();
    await u.click(drapeButton());
    await settle();
    await waitFor(() => expect(lastDraped()).toBeDefined());
    fireEvent.change(screen.getByLabelText(/^Longueur/), { target: { value: '55' } });
    await waitFor(() => expect(lastDraped()).toBeUndefined());
    expect(drapeButton().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Montrer le drapé' })).toBeNull();
  });

  it('nouvelle version : le drapé de la précédente est retiré', async () => {
    const u = await calculated();
    await u.click(drapeButton());
    await settle();
    await waitFor(() => expect(lastDraped()).toBeDefined());
    fake.client.createVersion = async () => ok(version(2));
    fireEvent.change(screen.getByLabelText(/^Longueur/), { target: { value: '55' } });
    await u.click(screen.getByRole('button', { name: 'Calculer le patron' }));
    await screen.findByText('Version 2');
    await waitFor(() => expect(lastDraped()).toBeUndefined());
  });
});

describe('fonctions du panneau', () => {
  it('la liste de tissus est celle du banc d’essai', () => {
    expect([...DRAPE_PRESETS]).toEqual(PRESET_NAMES);
  });

  it('message générique sans type de problème', () => {
    expect(drapeProblemMessage(undefined)).toBe('Le drapé a échoué.');
  });
});
