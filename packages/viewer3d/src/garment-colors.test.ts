import { describe, expect, it } from 'vitest';
import { tightVertices } from './garment-colors.js';

describe('sommets du vêtement dans une zone trop juste', () => {
  const positions = Float32Array.of(0, 70, 0, 0, 82, 0, 0, 90, 0, 0, 95, 0);

  it('marque les sommets dont la hauteur (cm → mm) est dans une zone', () => {
    expect(tightVertices(positions, [{ fromMm: 820, toMm: 900 }])).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('sans zone, rien n’est marqué', () => {
    expect(tightVertices(positions, [])).toEqual([false, false, false, false]);
  });
});
