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
