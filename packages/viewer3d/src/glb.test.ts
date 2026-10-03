import { describe, expect, it } from 'vitest';
import { METERS_TO_SCENE, readDrapedGlb } from './glb.js';

interface Piece {
  name: string;
  positionsM: number[];
  easeMm?: number[];
}

/** GLB minimal comme celui du moteur de drapé : mètres, un nœud par pièce, attributs POSITION, NORMAL, _EASE_MM. */
type Json = { accessors: Record<string, unknown>[]; bufferViews: Record<string, unknown>[] };

function buildGlb(pieces: Piece[], tweak?: (json: Json) => void): ArrayBuffer {
  const chunks: ArrayBuffer[] = [];
  const views: object[] = [];
  const accessors: object[] = [];
  const add = (data: Float32Array | Uint32Array, accessor: object) => {
    views.push({
      buffer: 0,
      byteOffset: chunks.reduce((n, c) => n + c.byteLength, 0),
      byteLength: data.byteLength,
    });
    accessors.push({ bufferView: views.length - 1, ...accessor });
    chunks.push(data.buffer as ArrayBuffer);
    return accessors.length - 1;
  };
  const meshes = pieces.map((p) => {
    const count = p.positionsM.length / 3;
    const attributes: Record<string, number> = {
      POSITION: add(Float32Array.from(p.positionsM), { componentType: 5126, count, type: 'VEC3' }),
      NORMAL: add(new Float32Array(count * 3), { componentType: 5126, count, type: 'VEC3' }),
    };
    if (p.easeMm) {
      attributes._EASE_MM = add(Float32Array.from(p.easeMm), {
        componentType: 5126,
        count,
        type: 'SCALAR',
      });
    }
    const indices = add(Uint32Array.of(0, 1, 2), { componentType: 5125, count: 3, type: 'SCALAR' });
    return { name: p.name, primitives: [{ attributes, indices }] };
  });
  const bin = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let at = 0;
  for (const c of chunks) {
    bin.set(new Uint8Array(c), at);
    at += c.byteLength;
  }
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: pieces.map((_, i) => i) }],
    nodes: pieces.map((p, i) => ({ name: p.name, mesh: i })),
    meshes,
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
  tweak?.(json as unknown as Json);
  return container(new TextEncoder().encode(JSON.stringify(json).padEnd(4096, ' ')), bin);
}

function container(jsonBytes: Uint8Array, bin: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(12 + 8 + jsonBytes.length + 8 + bin.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  view.setUint32(20 + jsonBytes.length, bin.length, true);
  view.setUint32(24 + jsonBytes.length, 0x004e4942, true);
  out.set(bin, 28 + jsonBytes.length);
  return out.buffer;
}

const TRIANGLE = [0, 0, 0, 0.5, 0, 0, 0, 1.25, 0.1];

describe('readDrapedGlb', () => {
  it('convertit les mètres en unité de scène (cm) sur un sommet connu', () => {
    const result = readDrapedGlb(buildGlb([{ name: 'front', positionsM: TRIANGLE }]));
    if (!result.ok) throw new Error(result.error.message);
    const layer = result.layers[0];
    expect(layer?.name).toBe('front');
    expect(METERS_TO_SCENE).toBe(100);
    expect(Array.from(layer?.positions.slice(6, 9) ?? [])).toEqual([0, 125, expect.closeTo(10, 4)]);
    expect(Array.from(layer?.index ?? [])).toEqual([0, 1, 2]);
    expect(layer?.normals).toHaveLength(9);
  });

  it('sans _EASE_MM : aucune zone serrée', () => {
    const result = readDrapedGlb(buildGlb([{ name: 'front', positionsM: TRIANGLE }]));
    expect(result.ok && result.layers[0]?.tight).toEqual([false, false, false]);
  });

  it('avec _EASE_MM : serrés = sommets à aisance négative', () => {
    const result = readDrapedGlb(
      buildGlb([
        { name: 'front', positionsM: TRIANGLE, easeMm: [12, -3, 0] },
        { name: 'back@left', positionsM: TRIANGLE, easeMm: [-1, 5, -0.5] },
      ]),
    );
    expect(result.ok && result.layers.map((l) => l.tight)).toEqual([
      [false, true, false],
      [true, false, true],
    ]);
    expect(result.ok && result.layers[1]?.name).toBe('back@left');
  });

  it('rend une erreur typée pour un fichier invalide, sans exception', () => {
    const garbage = readDrapedGlb(new Uint8Array(40).buffer);
    expect(garbage).toEqual({ ok: false, error: expect.objectContaining({ code: 'not-glb' }) });
    const truncated = readDrapedGlb(buildGlb([{ name: 'a', positionsM: TRIANGLE }]).slice(0, 60));
    expect(!truncated.ok && truncated.error.code).toBe('malformed');
    expect(readDrapedGlb(new ArrayBuffer(0)).ok).toBe(false);
  });

  it('rend no-primitive pour un modèle sans maillage', () => {
    const result = readDrapedGlb(buildGlb([]));
    expect(!result.ok && result.error.code).toBe('no-primitive');
  });

  describe('refuse un GLB incohérent par une erreur typée', () => {
    const piece = [{ name: 'a', positionsM: TRIANGLE }];
    const withEase = [{ name: 'a', positionsM: TRIANGLE, easeMm: [1, 2, 3] }];
    // Accesseurs d'une pièce : 0 POSITION, 1 NORMAL, 2 indices (3 sans _EASE_MM) ; avec _EASE_MM : 2 _EASE_MM, 3 indices.
    const codeOf = (pieces: Piece[], tweak: (json: Json) => void) => {
      const result = readDrapedGlb(buildGlb(pieces, tweak));
      return result.ok ? 'ok' : result.error.code;
    };
    const accessor = (json: Json, i: number) => json.accessors[i] as Record<string, unknown>;
    const view = (json: Json, i: number) => json.bufferViews[i] as Record<string, unknown>;

    it('accesseur qui déborde de sa vue : malformed', () => {
      expect(codeOf(piece, (j) => (accessor(j, 0).count = 100))).toBe('malformed');
    });

    it('vue qui déborde du chunk BIN : malformed', () => {
      expect(codeOf(piece, (j) => (view(j, 1).byteLength = 1_000_000))).toBe('malformed');
      expect(codeOf(piece, (j) => (view(j, 0).byteOffset = 1_000_000))).toBe('malformed');
    });

    it('buffer autre que 0 ou byteLength invalide : malformed', () => {
      expect(codeOf(piece, (j) => (view(j, 0).buffer = 1))).toBe('malformed');
      expect(codeOf(piece, (j) => (view(j, 0).byteLength = -4))).toBe('malformed');
    });

    it('index hors limites (>= nombre de sommets) : malformed', () => {
      const glb = buildGlb(piece);
      const bin = new DataView(glb, glb.byteLength - 12);
      bin.setUint32(8, 3, true);
      const result = readDrapedGlb(glb);
      expect(!result.ok && result.error.code).toBe('malformed');
    });

    it("nombre d'indices non multiple de 3 : malformed", () => {
      expect(codeOf(piece, (j) => (accessor(j, 2).count = 2))).toBe('malformed');
    });

    it('type de composant non géré : unsupported', () => {
      expect(codeOf(piece, (j) => (accessor(j, 0).componentType = 5120))).toBe('unsupported');
      expect(codeOf(piece, (j) => (accessor(j, 1).componentType = 5123))).toBe('unsupported');
      expect(codeOf(piece, (j) => (accessor(j, 2).componentType = 5126))).toBe('unsupported');
      expect(codeOf(withEase, (j) => (accessor(j, 2).componentType = 5125))).toBe('unsupported');
    });

    it("type d'accesseur faux : malformed", () => {
      expect(codeOf(piece, (j) => (accessor(j, 0).type = 'VEC2'))).toBe('malformed');
      expect(codeOf(piece, (j) => (accessor(j, 1).type = 'SCALAR'))).toBe('malformed');
      expect(codeOf(piece, (j) => (accessor(j, 2).type = 'VEC3'))).toBe('malformed');
      expect(codeOf(withEase, (j) => (accessor(j, 2).type = 'VEC3'))).toBe('malformed');
    });

    it('NORMAL ou _EASE_MM de mauvaise longueur : malformed', () => {
      expect(codeOf(piece, (j) => (accessor(j, 1).count = 2))).toBe('malformed');
      expect(codeOf(withEase, (j) => (accessor(j, 2).count = 2))).toBe('malformed');
    });

    it('count invalide (négatif, fractionnaire, absent) : malformed', () => {
      expect(codeOf(piece, (j) => (accessor(j, 0).count = -3))).toBe('malformed');
      expect(codeOf(piece, (j) => (accessor(j, 0).count = 1.5))).toBe('malformed');
      expect(codeOf(piece, (j) => delete accessor(j, 0).count)).toBe('malformed');
    });

    it('chunk BIN tronqué : malformed', () => {
      const glb = buildGlb(piece);
      const result = readDrapedGlb(glb.slice(0, glb.byteLength - 10));
      expect(!result.ok && result.error.code).toBe('malformed');
    });
  });
});
