import { initialForm, type PatternStudioActions, type PatternStudioState } from '@atelier/features';
import type { FittedMannequin } from '@atelier/mannequin';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatternStudioView } from '../src/screens/pattern-studio/view.js';

// Le module de la vue 3D ne se résout que quand le test le décide : on observe l'état de chargement.
const gate = vi.hoisted(() => {
  let release: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => (release = resolve));
  return { opened, release };
});

vi.mock('@atelier/viewer3d', async () => {
  await gate.opened;
  return { MannequinView: () => <div data-testid="mannequin-3d" /> };
});

const fitted: FittedMannequin = {
  body: {
    positions: new Float32Array(9),
    normals: new Float32Array(9),
    index: Uint32Array.from([0, 1, 2]),
  },
  measuredMm: {},
  landmarksMm: { crotch: 780, hip: 900, waist: 1050, neck: 1400, knee: 480, ankle: 80 },
};
const actions: PatternStudioActions = {
  setDisplay: vi.fn(),
  setSex: vi.fn(),
  setMeasurement: vi.fn(),
  setSkirt: vi.fn(),
  generate: vi.fn(),
};
const state: PatternStudioState = {
  form: initialForm,
  errors: {},
  status: 'ready',
  mannequinStatus: 'ready',
  mannequin: fitted,
  display: '3d',
};

describe('chargement différé de la vue 3D', () => {
  it('affiche « chargement » tant que le composant n’est pas résolu, puis la vue', async () => {
    render(<PatternStudioView state={state} actions={actions} />);
    expect(screen.getByText('Chargement de la vue 3D…')).toBeTruthy();
    expect(screen.queryByTestId('mannequin-3d')).toBeNull();
    gate.release();
    expect(await screen.findByTestId('mannequin-3d')).toBeTruthy();
    expect(screen.queryByText('Chargement de la vue 3D…')).toBeNull();
  });
});
