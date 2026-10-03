// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MannequinView } from './mannequin-view.js';

afterEach(cleanup);

describe('MannequinView', () => {
  it('sans WebGL, affiche le libellé fourni par l’appelant', () => {
    render(
      <MannequinView meshes={[]} color="#000000" label="3D" webglUnavailableLabel="WebGL requis" />,
    );
    expect(screen.getByRole('status').textContent).toBe('WebGL requis');
  });
});

describe('MannequinView, vêtement drapé', () => {
  it('accepte un vêtement drapé, exclusif de l’habillage géométrique', () => {
    const draped = { layers: [], color: '#c9c2b6', tightColor: '#b42318' };
    render(
      <MannequinView
        meshes={[]}
        color="#000"
        label="3D"
        webglUnavailableLabel="WebGL requis"
        draped={draped}
      />,
    );
    const garment = {
      mesh: { positions: new Float32Array(0), index: new Uint32Array(0) },
      color: '',
      tightColor: '',
      tightZones: [],
    };
    render(
      // @ts-expect-error garment et draped s'excluent
      <MannequinView
        meshes={[]}
        color="#000"
        label="3D"
        webglUnavailableLabel="x"
        draped={draped}
        garment={garment}
      />,
    );
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
