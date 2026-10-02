import { initialForm, type PatternStudioActions, type PatternStudioState } from '@atelier/features';
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
beforeEach(() => mockedView.mockImplementation(() => <div data-testid="mannequin-3d" />));

const box = {
  positions: Float32Array.from([0, 0, 0, 10, 0, 0, 10, 60, 0, 0, 60, 0]),
  normals: new Float32Array(12),
  index: Uint32Array.from([0, 1, 2, 0, 2, 3]),
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
});

const base: PatternStudioState = {
  form: initialForm,
  errors: {},
  status: 'idle',
  mannequinStatus: 'idle',
  display: '3d',
  dressing: { status: 'idle' },
  showGarment: true,
};

describe('vêtement porté', () => {
  const mesh = {
    positions: Float32Array.from([0, 0, 0, 40, 0, 0, 40, 40, 0, 0, 40, 0]),
    normals: new Float32Array(12),
    index: Uint32Array.from([0, 1, 2, 0, 2, 3]),
    tightZones: [{ fromMm: 820, toMm: 900, shortfallMm: 70 }],
  };
  const worn = {
    ...base,
    mannequin: fitted,
    mannequinStatus: 'ready' as const,
    dressing: { status: 'ready' as const, garment: mesh },
  };

  it('la vue 3D reçoit le maillage du vêtement et ses zones trop justes', async () => {
    const received: unknown[] = [];
    mockedView.mockImplementation((props: unknown) => {
      received.push(props);
      return <div data-testid="mannequin-3d" />;
    });
    render(<PatternStudioView state={{ ...worn, showGarment: true }} actions={actions()} />);
    await screen.findByTestId('mannequin-3d');
    expect(received[0]).toMatchObject({
      garment: { mesh, tightZones: [{ fromMm: 820, toMm: 900, shortfallMm: 70 }] },
    });
  });

  it('masqué : la vue 3D ne reçoit pas le vêtement', async () => {
    const received: unknown[] = [];
    mockedView.mockImplementation((props: unknown) => {
      received.push(props);
      return <div data-testid="mannequin-3d" />;
    });
    render(<PatternStudioView state={{ ...worn, showGarment: false }} actions={actions()} />);
    await screen.findByTestId('mannequin-3d');
    expect(received[0]).toMatchObject({ garment: undefined });
  });

  it('vue en trait : une silhouette du vêtement par vue', () => {
    render(
      <PatternStudioView
        state={{ ...worn, display: 'outline', showGarment: true }}
        actions={actions()}
      />,
    );
    const face = screen.getByRole('img', { name: 'Face' });
    expect(face.querySelector('path[data-layer="garment"]')).not.toBeNull();
  });

  it('zones trop justes en texte traduit, nombres formatés', () => {
    render(<PatternStudioView state={{ ...worn, showGarment: true }} actions={actions()} />);
    expect(screen.getByRole('listitem').textContent).toBe(
      'Trop juste de 70 mm entre 820 et 900 mm du sol',
    );
  });

  it('la bascule montre ou masque le vêtement', async () => {
    const a = actions();
    render(<PatternStudioView state={{ ...worn, showGarment: true }} actions={a} />);
    const toggle = screen.getByRole('button', { name: 'Montrer le vêtement' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(toggle);
    expect(a.setShowGarment).toHaveBeenCalledWith(false);
  });

  it('habillage en cours ou échoué : message traduit, pas de bascule', () => {
    const { rerender } = render(
      <PatternStudioView
        state={{ ...base, dressing: { status: 'working' } }}
        actions={actions()}
      />,
    );
    expect(screen.getByText('Habillage du mannequin…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Montrer le vêtement' })).toBeNull();
    rerender(
      <PatternStudioView state={{ ...base, dressing: { status: 'failed' } }} actions={actions()} />,
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'Le vêtement n’a pas pu être habillé sur le mannequin.',
    );
  });
});
