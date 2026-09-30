import { describe, expect, it } from 'vitest';
import { createMakeHuman } from '../src/core/makehuman.js';

describe('createMakeHuman avant load()', () => {
  const mh = createMakeHuman(async () => new Uint8Array());

  it("refuse d'ajuster et de mesurer tant que les données ne sont pas chargées", () => {
    expect(mh.ready()).toBe(false);
    expect(() => mh.fit({ stature: 170 }, { sex: 'femme' })).toThrow(/load\(\)/);
    expect(() => mh.measure(new Float32Array(3), 170)).toThrow(/load\(\)/);
  });
});
