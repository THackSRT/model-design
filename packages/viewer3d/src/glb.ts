// Lecteur GLB minimal pour le vêtement drapé (ADR 0013) : glTF 2.0 binaire, mètres, un nœud par exemplaire de
// pièce, une primitive par maillage, données serrées (sans entrelacement ni accesseur creux). Choisi plutôt que
// GLTFLoader : synchrone, sans décodage d'image ni DOM (donc testable sous jsdom), pas de renommage des attributs
// personnalisés (`_EASE_MM`), et quelques dizaines de lignes de moins dans le chunk de la visionneuse.

const MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const UNSIGNED_SHORT = 5123;
/** Le GLB est en mètres, la scène en centimètres (comme le mannequin) : même repère, seule l'échelle change. */
export const METERS_TO_SCENE = 100;

export type GlbErrorCode = 'not-glb' | 'unsupported' | 'malformed' | 'no-primitive';

export interface GlbError {
  code: GlbErrorCode;
  message: string;
}

/** Un exemplaire de pièce, en unité de scène (cm). */
export interface DrapedLayer {
  /** `<panelId>` ou `<panelId>@<côté>`. */
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  /** Vrai pour un sommet à aisance négative (`_EASE_MM` < 0) ; tout faux sans cet attribut. */
  tight: boolean[];
}

export type GlbResult = { ok: true; layers: DrapedLayer[] } | { ok: false; error: GlbError };

interface Accessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  sparse?: unknown;
}
interface BufferView {
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}
interface Primitive {
  attributes: Record<string, number>;
  indices?: number;
}
interface GltfJson {
  scenes?: { nodes?: number[] }[];
  scene?: number;
  nodes?: { name?: string; mesh?: number }[];
  meshes?: { name?: string; primitives?: Primitive[] }[];
  accessors?: Accessor[];
  bufferViews?: BufferView[];
}

class GlbFailure extends Error {
  constructor(readonly error: GlbError) {
    super(error.message);
  }
}
const fail = (code: GlbErrorCode, message: string): never => {
  throw new GlbFailure({ code, message });
};

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3 };

function readChunks(buffer: ArrayBuffer): { json: GltfJson; bin: DataView } {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== MAGIC)
    fail('not-glb', 'missing glTF header');
  if (view.getUint32(4, true) !== 2) fail('unsupported', 'only glTF 2.0 is supported');
  let json: GltfJson | undefined;
  let bin = new DataView(new ArrayBuffer(0));
  for (let at = 12; at + 8 <= buffer.byteLength;) {
    const length = view.getUint32(at, true);
    const type = view.getUint32(at + 4, true);
    if (at + 8 + length > buffer.byteLength) fail('malformed', 'chunk overruns the file');
    if (type === CHUNK_JSON) json = parseJson(buffer.slice(at + 8, at + 8 + length));
    else if (type === CHUNK_BIN && bin.byteLength === 0) bin = new DataView(buffer, at + 8, length);
    at += 8 + length;
  }
  return { json: json ?? fail('malformed', 'missing JSON chunk'), bin };
}

function parseJson(bytes: ArrayBuffer): GltfJson {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed === 'object' && parsed !== null) return parsed as GltfJson;
  } catch {
    // tombe sur l'erreur typée ci-dessous
  }
  return fail('malformed', 'invalid JSON chunk');
}

function componentReader(bin: DataView, type: number): (at: number) => number {
  if (type === FLOAT) return (at) => bin.getFloat32(at, true);
  if (type === UNSIGNED_INT) return (at) => bin.getUint32(at, true);
  if (type === UNSIGNED_SHORT) return (at) => bin.getUint16(at, true);
  return fail('unsupported', `component type ${type}`);
}

const offsetOf = (part: { byteOffset?: number }): number => part.byteOffset ?? 0;

/** Position, nombre de valeurs et taille d'une valeur d'un accesseur serré (ni creux ni entrelacé). */
function locate(json: GltfJson, index: number) {
  const accessor = json.accessors?.[index] ?? fail('malformed', `missing accessor ${index}`);
  const bufferView = json.bufferViews?.[accessor.bufferView];
  const width = COMPONENTS[accessor.type];
  if (!bufferView || !width) return fail('malformed', `bad accessor ${index}`);
  if (accessor.sparse || bufferView.byteStride) fail('unsupported', 'sparse or interleaved data');
  return {
    componentType: accessor.componentType,
    start: offsetOf(bufferView) + offsetOf(accessor),
    total: accessor.count * width,
    size: accessor.componentType === UNSIGNED_SHORT ? 2 : 4,
  };
}

/** Valeurs d'un accesseur, lues en petit-boutiste (aucune contrainte d'alignement). */
function readAccessor(json: GltfJson, bin: DataView, index: number): number[] {
  const { componentType, start, total, size } = locate(json, index);
  if (start + total * size > bin.byteLength)
    fail('malformed', `accessor ${index} overruns the buffer`);
  const read = componentReader(bin, componentType);
  return Array.from({ length: total }, (_, i) => read(start + i * size));
}

function layerOf(name: string, primitive: Primitive, json: GltfJson, bin: DataView): DrapedLayer {
  const { POSITION: position, NORMAL: normal, _EASE_MM: ease } = primitive.attributes;
  if (position === undefined || primitive.indices === undefined)
    fail('malformed', `${name}: no geometry`);
  const positions = readAccessor(json, bin, position as number).map((v) => v * METERS_TO_SCENE);
  const count = positions.length / 3;
  const index = readAccessor(json, bin, primitive.indices as number);
  if (index.some((i) => i >= count)) fail('malformed', `${name}: index out of range`);
  const easeMm = ease === undefined ? [] : readAccessor(json, bin, ease);
  return {
    name,
    positions: Float32Array.from(positions),
    normals:
      normal === undefined
        ? new Float32Array(0)
        : Float32Array.from(readAccessor(json, bin, normal)),
    index: Uint32Array.from(index),
    tight: Array.from({ length: count }, (_, v) => (easeMm[v] ?? 0) < 0),
  };
}

function readLayers(buffer: ArrayBuffer): DrapedLayer[] {
  const { json, bin } = readChunks(buffer);
  const order = json.scenes?.[json.scene ?? 0]?.nodes ?? json.nodes?.map((_, i) => i) ?? [];
  const layers = order.flatMap((n) => {
    const node = json.nodes?.[n];
    const mesh = node?.mesh === undefined ? undefined : json.meshes?.[node.mesh];
    return (mesh?.primitives ?? []).map((p) =>
      layerOf(node?.name ?? mesh?.name ?? `piece-${n}`, p, json, bin),
    );
  });
  return layers.length > 0 ? layers : fail('no-primitive', 'the model has no primitive');
}

/** Lit un GLB de drapé (mètres) en couches en unité de scène (cm). Ne lève jamais : l'échec est une valeur. */
export function readDrapedGlb(buffer: ArrayBuffer): GlbResult {
  try {
    return { ok: true, layers: readLayers(buffer) };
  } catch (error) {
    if (error instanceof GlbFailure) return { ok: false, error: error.error };
    return { ok: false, error: { code: 'malformed', message: 'unreadable model' } };
  }
}
