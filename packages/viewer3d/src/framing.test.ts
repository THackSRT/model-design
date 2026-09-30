import { describe, expect, it } from 'vitest';
import { boundsOf, cameraDistance } from './framing.js';

describe('cadrage', () => {
  it('calcule la boîte englobante de plusieurs maillages', () => {
    const b = boundsOf([Float32Array.of(0, 0, 0, 10, 170, 5), Float32Array.of(-3, 20, -2)]);
    expect(b).toEqual({ min: [-3, 0, -2], max: [10, 170, 5] });
  });

  it('recule la caméra pour voir toute la hauteur', () => {
    const d = cameraDistance({ min: [0, 0, 0], max: [0, 170, 0] }, 30, 1);
    expect(d * Math.tan((15 * Math.PI) / 180)).toBeCloseTo(85);
  });
});
