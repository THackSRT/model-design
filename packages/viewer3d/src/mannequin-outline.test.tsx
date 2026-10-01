// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as silhouette from './silhouette/index.js';
import { MannequinOutline } from './mannequin-outline.js';
import { merge, rectangle } from '../test/fixtures.js';

vi.mock('./silhouette/index.js', async (original) => {
  const actual = await original<typeof silhouette>();
  return { ...actual, silhouettePaths: vi.fn(actual.silhouettePaths) };
});

afterEach(cleanup);

const labels = { front: 'Face', side: 'Profil', back: 'Dos' };
const mesh = merge(rectangle(0, 0, 10, 60), rectangle(0, 0, 40, 10));

describe('MannequinOutline', () => {
  it('rend un svg par vue demandée avec un viewBox en cm', () => {
    render(<MannequinOutline mesh={mesh} views={['front', 'back']} labels={labels} marginCm={2} />);
    const front = screen.getByRole('img', { name: 'Face' });
    expect(screen.getByRole('img', { name: 'Dos' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Profil' })).toBeNull();
    expect(front.tagName.toLowerCase()).toBe('svg');
    expect(front.getAttribute('viewBox')).toBe('-2 -2 44 64');
    expect(front.querySelector('path')?.getAttribute('d')).toMatch(/^M.*Z$/);
  });

  it('n’écrit ni couleur ni épaisseur en dur', () => {
    render(<MannequinOutline mesh={mesh} views={['front']} labels={labels} />);
    const style = screen.getByRole('img').querySelector('path')?.getAttribute('style') ?? '';
    expect(style).toContain('var(--color-pattern-stroke)');
    expect(style).toContain('var(--stroke-pattern)');
  });

  it('ne recalcule pas pour un nouveau tableau de vues de même contenu', () => {
    const spy = vi.mocked(silhouette.silhouettePaths);
    spy.mockClear();
    const { rerender } = render(<MannequinOutline mesh={mesh} views={['front']} labels={labels} />);
    rerender(<MannequinOutline mesh={mesh} views={['front']} labels={labels} />);
    expect(spy).toHaveBeenCalledTimes(1);
    rerender(<MannequinOutline mesh={mesh} views={['front', 'back']} labels={labels} />);
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('MannequinOutline avec vêtement', () => {
  const body = rectangle(10, 0, 20, 60);
  const dress = rectangle(5, 0, 30, 40);

  it('superpose la silhouette du vêtement, d’un trait distinct, dans un repère commun', () => {
    render(<MannequinOutline mesh={body} garment={dress} views={['front']} labels={labels} />);
    const svg = screen.getByRole('img', { name: 'Face' });
    expect(svg.querySelectorAll('path')).toHaveLength(2);
    const garment = svg.querySelector('path[data-layer="garment"]');
    expect(garment?.getAttribute('d')).toMatch(/^M.*Z$/);
    // Le vêtement déborde le corps de 5 cm à gauche et est plus court de 20 cm.
    expect(svg.querySelector('path:not([data-layer])')?.getAttribute('transform')).toBe(
      'translate(5 0)',
    );
    expect(garment?.getAttribute('transform')).toBe('translate(0 20)');
    expect(svg.getAttribute('viewBox')).toBe('-2 -2 29 64');
    expect((garment as SVGElement).style.stroke).toBe('var(--color-garment-stroke)');
  });

  it('sans vêtement : un seul tracé, repère inchangé', () => {
    render(<MannequinOutline mesh={body} views={['front']} labels={labels} />);
    const svg = screen.getByRole('img', { name: 'Face' });
    expect(svg.querySelectorAll('path')).toHaveLength(1);
    expect(svg.getAttribute('viewBox')).toBe('-2 -2 14 64');
  });
});
