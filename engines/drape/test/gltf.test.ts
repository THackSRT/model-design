import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildGlb,
  drapeGarment,
  loadAvatarEngine,
  pieceName,
  type DrapeSuccess,
} from '../src/node.js';
import { fixture, jobOf } from './drape-helpers.js';

interface Accessor {
  bufferView: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
}

interface Gltf {
  asset: { version: string; generator: string };
  nodes: { name: string; mesh: number }[];
  meshes: { name: string; primitives: { attributes: Record<string, number>; indices: number }[] }[];
  accessors: Accessor[];
  bufferViews: { byteOffset: number; byteLength: number }[];
  buffers: { byteLength: number }[];
}

function parse(glb: Uint8Array): { json: Gltf; bin: DataView; jsonLen: number; binLen: number } {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  expect(view.getUint32(0, true)).toBe(0x46546c67);
  expect(view.getUint32(4, true)).toBe(2);
  expect(view.getUint32(8, true)).toBe(glb.length);
  const jsonLen = view.getUint32(12, true);
  expect(view.getUint32(16, true)).toBe(0x4e4f534a);
  const text = new TextDecoder().decode(glb.subarray(20, 20 + jsonLen));
  const binLen = view.getUint32(20 + jsonLen, true);
  expect(view.getUint32(24 + jsonLen, true)).toBe(0x004e4942);
  expect(28 + jsonLen + binLen).toBe(glb.length);
  const bin = new DataView(glb.buffer, glb.byteOffset + 28 + jsonLen, binLen);
  return { json: JSON.parse(text) as Gltf, bin, jsonLen, binLen };
}

const WIDTHS = { POSITION: 3, NORMAL: 3, TEXCOORD_0: 2, _EASE_MM: 1, _STRAIN: 1 };

describe('glTF binaire du drapé', () => {
  let out: DrapeSuccess;
  let glb: Uint8Array;
  beforeAll(async () => {
    await loadAvatarEngine();
    const result = drapeGarment(jobOf(fixture('straight-skirt')), { maxSteps: 100 });
    if (!result.ok) throw new Error(result.problem.type);
    out = result;
    glb = buildGlb(out);
  });

  it('a un en-tête, des blocs JSON et BIN alignés sur 4 octets', () => {
    const { json, jsonLen, binLen } = parse(glb);
    expect(jsonLen % 4).toBe(0);
    expect(binLen % 4).toBe(0);
    expect(json.asset.version).toBe('2.0');
    expect(json.asset.generator).toMatch(/^atelier-drape \d+\.\d+\.\d+$/);
    const declared = json.buffers[0]?.byteLength as number;
    expect(declared).toBeLessThanOrEqual(binLen);
    expect(binLen - declared).toBeLessThan(4);
  });

  it('a des accesseurs cohérents avec les vues, les sommets et les triangles', () => {
    const { json } = parse(glb);
    for (const [k, mesh] of json.meshes.entries()) {
      const piece = out.mesh.pieces[k] as (typeof out.mesh.pieces)[number];
      const prim = mesh.primitives[0] as Gltf['meshes'][number]['primitives'][number];
      for (const [name, width] of Object.entries(WIDTHS)) {
        const acc = json.accessors[prim.attributes[name] as number] as Accessor;
        expect(acc.count).toBe(piece.vertexCount);
        expect(acc.componentType).toBe(5126);
        const view = json.bufferViews[acc.bufferView] as Gltf['bufferViews'][number];
        expect(view.byteLength).toBe(acc.count * width * 4);
        expect(view.byteOffset % 4).toBe(0);
      }
      const idx = json.accessors[prim.indices] as Accessor;
      expect(idx.count).toBe(3 * piece.triangleCount);
      expect(idx.componentType).toBe(5125);
    }
  });

  it('donne min et max exacts des positions, en mètres', () => {
    const { json, bin } = parse(glb);
    const prim = json.meshes[0]?.primitives[0] as Gltf['meshes'][number]['primitives'][number];
    const acc = json.accessors[prim.attributes['POSITION'] as number] as Accessor;
    const view = json.bufferViews[acc.bufferView] as Gltf['bufferViews'][number];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < acc.count * 3; i++) {
      const x = bin.getFloat32(view.byteOffset + 4 * i, true);
      min[i % 3] = Math.min(min[i % 3] as number, x);
      max[i % 3] = Math.max(max[i % 3] as number, x);
    }
    expect(acc.min).toEqual(min);
    expect(acc.max).toEqual(max);
    const first = out.mesh.pieces[0] as (typeof out.mesh.pieces)[number];
    const mm = out.positionsMm[3 * first.vertexStart + 1] as number;
    expect(bin.getFloat32(view.byteOffset + 4, true)).toBeCloseTo(mm / 1000, 5);
  });

  it('a des indices locaux valides et des normales unitaires', () => {
    const { json, bin } = parse(glb);
    const prim = json.meshes[0]?.primitives[0] as Gltf['meshes'][number]['primitives'][number];
    const count = (json.accessors[prim.attributes['POSITION'] as number] as Accessor).count;
    const idx = json.accessors[prim.indices] as Accessor;
    const iv = json.bufferViews[idx.bufferView] as Gltf['bufferViews'][number];
    for (let i = 0; i < idx.count; i++) {
      expect(bin.getUint32(iv.byteOffset + 4 * i, true)).toBeLessThan(count);
    }
    const normal = json.accessors[prim.attributes['NORMAL'] as number] as Accessor;
    const nv = json.bufferViews[normal.bufferView] as Gltf['bufferViews'][number];
    for (let v = 0; v < count; v++) {
      const c = [0, 1, 2].map((k) => bin.getFloat32(nv.byteOffset + 12 * v + 4 * k, true));
      expect(Math.hypot(...c)).toBeCloseTo(1, 4);
    }
  });

  it('rend les mêmes octets pour les mêmes entrées', () => {
    expect(Buffer.from(buildGlb(out)).equals(Buffer.from(glb))).toBe(true);
  });

  it('contient une primitive par exemplaire de pièce, nommée', () => {
    const { json } = parse(glb);
    expect(out.mesh.pieces.length).toBeGreaterThan(1);
    expect(json.meshes.length).toBe(out.mesh.pieces.length);
    expect(json.nodes.length).toBe(out.mesh.pieces.length);
    expect(json.meshes.every((m) => m.primitives.length === 1)).toBe(true);
    expect(json.meshes.map((m) => m.name)).toEqual(out.mesh.pieces.map(pieceName));
    expect(new Set(json.meshes.map((m) => m.name)).size).toBe(json.meshes.length);
  });
});
