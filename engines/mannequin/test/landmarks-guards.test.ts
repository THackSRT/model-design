import { describe, expect, it, vi } from 'vitest';

const { fake } = vi.hoisted(() => ({
  fake: { rings: {} as Record<string, unknown>, crotch: undefined as number | undefined },
}));

vi.mock('../src/core/makehuman.js', () => ({
  createMakeHuman: () => ({
    load: async () => ({}),
    FIT_KEYS: [],
    fit: () => ({
      pos: new Float32Array(3),
      measured: {
        rings: fake.rings,
        ...(fake.crotch === undefined ? {} : { crotch: fake.crotch }),
      },
    }),
    baseTriangles: () => new Uint16Array(),
    pose: (pos: Float32Array) => ({ pos }),
    renderGeometry: () => ({}),
  }),
}));
vi.mock('../src/core/plain-face.js', () => ({
  plainFace: (pos: Float32Array) => ({ pos, drop: new Uint8Array() }),
}));

import { loadMannequinEngine } from '../src/index.js';

const set = {
  sex: 'female',
  statureMm: 1700,
  chestGirthMm: 900,
  waistGirthMm: 700,
  hipGirthMm: 950,
} as const;
const ring = { center: [0, 50, 0] };

describe('repères absents', () => {
  it("signale une zone de mesure absente au lieu d'écrire 0", async () => {
    fake.rings = { neck: ring, hip: ring };
    fake.crotch = 80;
    const engine = await loadMannequinEngine(async () => new Uint8Array());
    expect(() => engine.fit(set)).toThrow(/waist/);
  });

  it("signale un entrejambe absent au lieu d'écrire 0", async () => {
    fake.rings = { neck: ring, hip: ring, waist: ring, knee: ring, ankle: ring };
    fake.crotch = undefined;
    const engine = await loadMannequinEngine(async () => new Uint8Array());
    expect(() => engine.fit(set)).toThrow(/crotch/);
  });
});
