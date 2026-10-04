import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, distanceMm } from '../src/index.js';
import * as nodeEntry from '../src/node.js';

describe('moteur __name__', () => {
  it('mesure une distance en millimètres', () => {
    expect(distanceMm({ xMm: 0, yMm: 0 }, { xMm: 3, yMm: 4 })).toBe(5);
    expect(distanceMm({ xMm: 3, yMm: 4 }, { xMm: 3, yMm: 4 })).toBe(0);
  });

  it('rend le même résultat sur les deux entrées', () => {
    const a = { xMm: 12.5, yMm: -40 };
    const b = { xMm: -7.25, yMm: 301.5 };
    expect(nodeEntry.distanceMm(a, b)).toBe(distanceMm(a, b));
  });

  it('porte une ENGINE_VERSION de la forme x.y.z, la même sur les deux entrées', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(nodeEntry.ENGINE_VERSION).toBe(ENGINE_VERSION);
  });
});
