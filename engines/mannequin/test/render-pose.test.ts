import { describe, expect, it } from 'vitest';
import { pose } from '../src/core/pose.js';
import { renderGeometry } from '../src/core/render.js';
import type { MhData, MhModel } from '../src/core/types.js';

describe('renderGeometry', () => {
  const data = {
    trisBase: Uint16Array.from([0, 1, 2]),
    rv2b: Uint16Array.from([0, 1, 2, 2]),
    tris: Uint16Array.from([0, 1, 2, 0, 2, 3]),
    uv: Float32Array.from([0, 0, 1, 0, 0, 1, 0, 1]),
  } as unknown as MhModel;
  const pos = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]);

  it('duplique les sommets de rendu et rend des normales unitaires', () => {
    const g = renderGeometry(data, pos);
    expect(g.positions).toHaveLength(12);
    expect([...g.normals.slice(0, 3)]).toEqual([0, 0, 1]);
    expect([...g.normals.slice(9, 12)]).toEqual([0, 0, 1]);
    expect(g.index).toEqual(data.tris);
    expect(g.index).not.toBe(data.tris);
    expect(g.uvs).toEqual(data.uv);
    expect(g.uvs).not.toBe(data.uv);
  });

  it('retire les triangles qui touchent un sommet à ne pas afficher', () => {
    const g = renderGeometry(data, pos, Uint8Array.from([0, 1, 0]));
    // le premier triangle touche le sommet 1 ; le second (0, 2, 3) reste
    expect([...g.index]).toEqual([0, 2, 3]);
    const only = renderGeometry(data, pos, Uint8Array.from([0, 0, 0]));
    expect([...only.index]).toEqual([0, 1, 2, 0, 2, 3]);
  });
});

describe('pose', () => {
  // Bras gauche (L) le long de +x depuis l'épaule (0, 0, 0) jusqu'au poignet (10, 0, 0) ; R en miroir.
  const pos = Float32Array.from([0, 0, 0, 10, 0, 0, 5, 0, 0, 0, 0, 0, -10, 0, 0, -5, 0, 0]);
  const data: Pick<MhData, 'joints' | 'arm'> = {
    joints: {
      'upperarm01.L': [0],
      'wrist.L': [1],
      'upperarm01.R': [3],
      'wrist.R': [4],
    },
    arm: {
      L: { idx: Uint16Array.from([1, 2]), w: Uint8Array.from([255, 255]) },
      R: { idx: Uint16Array.from([4, 5]), w: Uint8Array.from([255, 255]) },
    },
  };

  it("abaisse les bras à l'angle demandé de la verticale, à longueur égale", () => {
    const { pos: out } = pose(data, pos, 20);
    const a = (20 * Math.PI) / 180;
    expect(out[3]).toBeCloseTo(10 * Math.sin(a), 4);
    expect(out[4]).toBeCloseTo(-10 * Math.cos(a), 4);
    expect(out[12]).toBeCloseTo(-10 * Math.sin(a), 4);
    expect(Math.hypot(out[3] ?? 0, out[4] ?? 0, out[5] ?? 0)).toBeCloseTo(10, 4);
  });

  it("laisse en place les sommets sans poids de peau et ne modifie pas l'entrée", () => {
    const before = [...pos];
    const { pos: out } = pose(data, pos);
    expect([...out.slice(0, 3)]).toEqual([0, 0, 0]);
    expect([...pos]).toEqual(before);
  });

  it('rot applique la rotation complète à un point', () => {
    const { pos: out, rot } = pose(data, pos, 20);
    const p = rot.L([10, 0, 0]);
    expect(p[0]).toBeCloseTo(out[3] ?? 0, 4);
    expect(p[1]).toBeCloseTo(out[4] ?? 0, 4);
  });
});
