import { initialForm, toVersionRequest } from '@atelier/features';
import { err, ok } from '@atelier/kernel';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternStudioScreen } from '../src/screens/pattern-studio/screen.js';

const fake = vi.hoisted(() => ({ client: {} as Record<string, unknown> }));

vi.mock('@atelier/features', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  createDesignsClient: () => fake.client,
}));
vi.mock('../src/platform/mannequin.js', () => ({
  getMannequinFitter: () => ({
    fit: () => Promise.reject(new Error('indisponible')),
    dress: () => new Promise(() => undefined),
  }),
}));
vi.mock('../src/platform/download.js', () => ({ browserFileSaver: { save: vi.fn() } }));

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
const summary = (number: number) => ({
  number,
  createdAt: stamp.createdAt,
  fingerprint: stamp.fingerprint,
  engineVersion: '0.1.0',
  garment: { type: 'straight-skirt', params: { lengthMm: 600 } },
});

function version(number: number, lengthMm: number) {
  const base = toVersionRequest(initialForm);
  if (base.isErr()) throw new Error('formulaire invalide');
  const garment = { type: 'straight-skirt' as const, params: { lengthMm } };
  return { ...base.value, garment, designId: 'd1', number, ...stamp, spec };
}

const unused = { type: '/problems/unused', title: 'x', status: 500 };
const getVersion = vi.fn();

beforeEach(() => {
  getVersion.mockReset();
  getVersion.mockImplementation(async (_id: string, n: number) => ok(version(n, 700)));
  fake.client = {
    createDesign: async () => ok({ id: 'd1' }),
    createVersion: async () => ok(version(1, 600)),
    listVersions: async () => ok({ designId: 'd1', items: [summary(1)] }),
    getVersion,
    getVersionChanges: async () => err(unused),
    cutPattern: async () => err(unused),
    exportFile: async () => err(unused),
  };
});

const length = () => screen.getByLabelText<HTMLInputElement>(/^Longueur/);
async function generated(confirm: (m: string) => boolean) {
  render(<PatternStudioScreen confirm={confirm} />);
  await userEvent.click(screen.getByRole('button', { name: 'Calculer le patron' }));
  await screen.findByRole('button', { name: 'Reprendre la version 1' });
}
const edit = () => fireEvent.change(length(), { target: { value: '55' } });

describe('reprise d’une version dans le studio', () => {
  it('sans modèle calculé : pas de panneau Historique', () => {
    render(<PatternStudioScreen confirm={() => true} />);
    expect(screen.queryByRole('region', { name: 'Historique' })).toBeNull();
  });

  it('sans modification : pas de question, formulaire rechargé, patron effacé', async () => {
    const confirm = vi.fn(() => false);
    await generated(confirm);
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre la version 1' }));
    await vi.waitFor(() => expect(length().value).toBe('70'));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText('Saisissez les mesures puis calculez.')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Historique' })).toBeTruthy();
  });

  it('modifications et refus : question traduite, rien ne change', async () => {
    const confirm = vi.fn(() => false);
    await generated(confirm);
    edit();
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre la version 1' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/non calculées.*version 1/));
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(length().value).toBe('55');
  });

  it('modifications et accord : le formulaire est remplacé', async () => {
    const confirm = vi.fn(() => true);
    await generated(confirm);
    edit();
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre la version 1' }));
    await vi.waitFor(() => expect(length().value).toBe('70'));
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('échec : alerte traduite, formulaire inchangé', async () => {
    getVersion.mockResolvedValue(err({ type: '/problems/network', title: 'x', status: 0 }));
    await generated(() => true);
    edit();
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre la version 1' }));
    expect(await screen.findByText(/Le service est injoignable/)).toBeTruthy();
    expect(length().value).toBe('55');
  });
});
