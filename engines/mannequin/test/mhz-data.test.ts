import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { gunzip, parse } from '../src/core/mhz-data.js';

const f32 = (...v: number[]): Uint8Array => new Uint8Array(Float32Array.from(v).buffer);
const u16 = (...v: number[]): Uint8Array => new Uint8Array(Uint16Array.from(v).buffer);
const i16 = (...v: number[]): Uint8Array => new Uint8Array(Int16Array.from(v).buffer);

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Fichier minimal : 3 sommets de base, 4 de rendu, 1 triangle, 1 cible, bras L (1 sommet) et R (2). */
function sampleFile(): Uint8Array {
  const header = {
    nBase: 3,
    nRender: 4,
    nTris: 1,
    targets: [{ name: 'test/up', n: 2 }],
    arm: { L: 1, R: 2 },
    joints: { 'wrist.L': [0, 1] },
    quant: 0.25,
  };
  const head = new TextEncoder().encode(JSON.stringify(header));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, head.length, true);
  return concat([
    len,
    head,
    new Uint8Array((4 - ((4 + head.length) % 4)) % 4),
    f32(0, 1, 2, 3, 4, 5, 6, 7, 8), // base
    f32(0, 0, 1, 1, 0, 1, 1, 0), // uv
    u16(0, 1, 2, 2), // rv2b
    u16(0, 1, 3), // triangle
    u16(0, 2),
    i16(1, 2, 3, -1, -2, -3), // cible
    u16(1),
    Uint8Array.from([200, 0]), // bras L : un poids, un octet de bourrage
    u16(0, 2),
    Uint8Array.from([10, 20]), // bras R
  ]);
}

describe('gunzip', () => {
  it('décompresse des données gzip', async () => {
    const raw = Uint8Array.from([1, 2, 3, 4, 5]);
    const out = await gunzip(new Uint8Array(gzipSync(raw)));
    expect([...out]).toEqual([...raw]);
  });

  it('laisse passer des données déjà décompressées', async () => {
    const raw = Uint8Array.from([9, 8, 7]);
    expect(await gunzip(raw)).toBe(raw);
  });
});

describe('parse', () => {
  it('lit maillage, UV, triangles, cibles et poids de peau', () => {
    const m = parse(sampleFile());
    expect(m.base).toHaveLength(9);
    expect(m.base[8]).toBe(8);
    expect(m.uv).toHaveLength(8);
    expect([...m.rv2b]).toEqual([0, 1, 2, 2]);
    expect([...m.tris]).toEqual([0, 1, 3]);
    expect([...(m.targets['test/up']?.idx ?? [])]).toEqual([0, 2]);
    expect([...(m.targets['test/up']?.d ?? [])]).toEqual([1, 2, 3, -1, -2, -3]);
    expect([...m.arm.L.idx]).toEqual([1]);
    expect([...m.arm.L.w]).toEqual([200]);
    expect([...m.arm.R.idx]).toEqual([0, 2]);
    expect([...m.arm.R.w]).toEqual([10, 20]);
    expect(m.q).toBe(0.25);
    expect(m.joints['wrist.L']).toEqual([0, 1]);
  });
});
