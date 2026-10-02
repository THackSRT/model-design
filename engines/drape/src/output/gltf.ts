import type { DrapeSuccess } from '../drape/drape-garment.js';
import type { GarmentPiece } from '../mesh/garment-mesh.js';
import { ENGINE_VERSION } from '../version.js';
import { pieceArrays, type PieceArrays } from './piece-arrays.js';

// glTF 2.0 binaire du vêtement drapé (ADR 0013) : mètres, une primitive par exemplaire de pièce, octets identiques
// d'une exécution à l'autre (aucun horodatage, ordre fixe, petit-boutiste explicite). Sans E/S ni `node:*`.

const MAGIC = 0x46546c67; // « glTF »
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0', '_EASE_MM', '_STRAIN'] as const;
const ATTRIBUTE_TYPES = ['VEC3', 'VEC3', 'VEC2', 'SCALAR', 'SCALAR'] as const;
const COMPONENTS = { VEC3: 3, VEC2: 2, SCALAR: 1 } as const;
/** Une vue et un accesseur par attribut, plus un pour les indices. */
const PARTS_PER_PIECE = ATTRIBUTES.length + 1;

type Json = Record<string, unknown>;
type Part = Float32Array | Uint32Array;

/** Nom de l'exemplaire : `<panelId>` pour la pièce dessinée, `<panelId>@<côté>` pour sa copie. */
export const pieceName = (piece: GarmentPiece): string =>
  piece.copy === 0 ? piece.panelId : `${piece.panelId}@${piece.side}`;

function boundsOf(positions: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const k = i % 3;
    min[k] = Math.min(min[k] as number, positions[i] as number);
    max[k] = Math.max(max[k] as number, positions[i] as number);
  }
  return { min, max };
}

const partsOf = (a: PieceArrays): Part[] => [
  a.positions,
  a.normals,
  a.texcoords,
  a.easeMm,
  a.strain,
  a.indices,
];

/** Accesseur d'une partie : les cinq attributs, puis les indices. */
function accessorOf(part: Part, index: number, view: number, positions: Float32Array): Json {
  if (index === ATTRIBUTES.length) {
    return { bufferView: view, componentType: UNSIGNED_INT, count: part.length, type: 'SCALAR' };
  }
  const type = ATTRIBUTE_TYPES[index] as keyof typeof COMPONENTS;
  const accessor: Json = {
    bufferView: view,
    componentType: FLOAT,
    count: part.length / COMPONENTS[type],
    type,
  };
  // glTF exige min et max sur POSITION.
  return index === 0 ? { ...accessor, ...boundsOf(positions) } : accessor;
}

function primitive(base: number): Json {
  const attributes: Json = {};
  ATTRIBUTES.forEach((name, i) => {
    attributes[name] = base + i;
  });
  return { attributes, indices: base + ATTRIBUTES.length, mode: 4 };
}

const pad4 = (n: number): number => (n + 3) & ~3;

function writeParts(parts: Part[], total: number): Uint8Array {
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  let at = 0;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      if (part instanceof Float32Array) view.setFloat32(at, part[i] as number, true);
      else view.setUint32(at, part[i] as number, true);
      at += 4;
    }
  }
  return bytes;
}

/** En-tête, bloc JSON (rempli d'espaces) et bloc BIN (rempli de zéros), chacun aligné sur 4 octets. */
function container(json: Json, bin: Uint8Array): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = pad4(jsonBytes.length);
  const binLen = pad4(bin.length);
  const out = new Uint8Array(12 + 8 + jsonLen + 8 + binLen);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, jsonLen, true);
  view.setUint32(16, CHUNK_JSON, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLen);
  view.setUint32(20 + jsonLen, binLen, true);
  view.setUint32(24 + jsonLen, CHUNK_BIN, true);
  out.set(bin, 28 + jsonLen);
  return out;
}

/** Modèle GLB 2.0 du drapé : un nœud et un maillage par exemplaire de pièce, chacun d'une primitive. */
export function buildGlb(success: DrapeSuccess): Uint8Array {
  const bufferViews: Json[] = [];
  const accessors: Json[] = [];
  const meshes: Json[] = [];
  const nodes: Json[] = [];
  const scene: number[] = [];
  const parts: Part[] = [];
  let offset = 0;
  success.mesh.pieces.forEach((piece, k) => {
    const arrays = pieceArrays(success, piece);
    const base = k * PARTS_PER_PIECE;
    partsOf(arrays).forEach((part, i) => {
      const target = i === ATTRIBUTES.length ? ELEMENT_ARRAY_BUFFER : ARRAY_BUFFER;
      bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: part.byteLength, target });
      accessors.push(accessorOf(part, i, base + i, arrays.positions));
      parts.push(part);
      offset += part.byteLength;
    });
    meshes.push({ name: pieceName(piece), primitives: [primitive(base)] });
    nodes.push({ name: pieceName(piece), mesh: k });
    scene.push(k);
  });
  const json: Json = {
    asset: { version: '2.0', generator: `atelier-drape ${ENGINE_VERSION}` },
    scene: 0,
    scenes: [{ nodes: scene }],
    nodes,
    meshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  return container(json, writeParts(parts, offset));
}
