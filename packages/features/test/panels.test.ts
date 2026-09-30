import { describe, expect, it } from 'vitest';
import { layoutPanels } from '../src/pattern-studio/panels.js';
import { spec } from './fakes.js';

describe('mise en page des pièces', () => {
  it('place les pièces côte à côte avec un écart', () => {
    const layout = layoutPanels(spec);
    expect(layout.panels.map((p) => p.id)).toEqual(['front', 'back']);
    expect(layout.panels[1]?.path.startsWith('M 290.0 600.0')).toBe(true);
    expect(layout.viewBox).toBe('-10 -10 560 620');
  });

  it('dessine les courbes de Bézier et retourne l’axe vertical', () => {
    const front = layoutPanels(spec).panels[0];
    expect(front?.path).toBe(
      'M 0.0 600.0 L 250.0 600.0 Q 250.0 150.0 180.0 0.0 L 0.0 0.0 L 0.0 600.0 Z',
    );
  });
});
