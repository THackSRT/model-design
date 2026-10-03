// Lecteur GLB minimal pour le vêtement drapé (ADR 0013) : glTF 2.0 binaire, mètres, un nœud par exemplaire de
// pièce, une primitive par maillage, données serrées (sans entrelacement ni accesseur creux). Choisi plutôt que
// GLTFLoader : synchrone, sans décodage d'image ni DOM (donc testable sous jsdom), pas de renommage des attributs
// personnalisés (`_EASE_MM`), et quelques dizaines de lignes de moins dans le chunk de la visionneuse.
// Les transformations de nœud (translation, rotation, échelle, matrice) sont volontairement ignorées : le moteur
// de drapé n'en émet pas, les sommets sont déjà dans le repère final.
// Erreurs : `unsupported` = fonctionnalité valide du format mais non gérée (version, type de composant, creux,
// entrelacé) ; `malformed` = fichier incohérent (accesseur ou vue hors limites, type d'accesseur faux, comptes
// qui ne collent pas, index hors sommets).

const MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_BYTE = 5121;
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
  buffer?: number;
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
  if (type === UNSIGNED_BYTE) return (at) => bin.getUint8(at);
  return fail('unsupported', `component type ${type}`);
}

const SIZES: Record<number, number> = {
  [FLOAT]: 4,
  [UNSIGNED_INT]: 4,
  [UNSIGNED_SHORT]: 2,
  [UNSIGNED_BYTE]: 1,
};

/** Ce qu'on attend d'un accesseur : son type glTF et les types de composant acceptés. */
interface Expect {
  type: string;
  components: number[];
  label: string;
}
const VEC3: Expect = { type: 'VEC3', components: [FLOAT], label: 'POSITION' };
const NORMAL: Expect = { ...VEC3, label: 'NORMAL' };
const SCALAR_FLOAT: Expect = { type: 'SCALAR', components: [FLOAT], label: '_EASE_MM' };
const SCALAR_INDEX: Expect = {
  type: 'SCALAR',
  components: [UNSIGNED_BYTE, UNSIGNED_SHORT, UNSIGNED_INT],
  label: 'indices',
};

const offsetOf = (part: { byteOffset?: number }): number => part.byteOffset ?? 0;
const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** Vue contrôlée : dans le buffer 0 (le chunk BIN), de longueur valide. Rend son début et sa fin. */
function checkView(view: BufferView, bin: DataView, index: number): { from: number; to: number } {
  if ((view.buffer ?? 0) !== 0 || !isCount(view.byteLength) || !isCount(offsetOf(view)))
    fail('malformed', `bad buffer view of accessor ${index}`);
  if (view.byteStride) fail('unsupported', 'sparse or interleaved data');
  const from = offsetOf(view);
  if (from + view.byteLength > bin.byteLength)
    fail('malformed', `buffer view of accessor ${index} overruns the buffer`);
  return { from, to: from + view.byteLength };
}

function checkAccessor(accessor: Accessor, expected: Expect, index: number): void {
  if (!isCount(accessor.count) || accessor.type !== expected.type)
    fail('malformed', `bad accessor ${index}`);
  if (accessor.sparse) fail('unsupported', 'sparse or interleaved data');
  if (!expected.components.includes(accessor.componentType))
    fail('unsupported', `accessor ${index}: component type ${accessor.componentType}`);
}

/** Accesseur et vue contrôlés : serrés (ni creux ni entrelacés), dans leur vue, dans le chunk BIN. */
function locate(json: GltfJson, bin: DataView, index: number, expected: Expect) {
  const accessor = json.accessors?.[index] ?? fail('malformed', `missing accessor ${index}`);
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView) return fail('malformed', `bad accessor ${index}`);
  checkAccessor(accessor, expected, index);
  const { from, to } = checkView(bufferView, bin, index);
  const size = SIZES[accessor.componentType] ?? 4;
  const total = accessor.count * (COMPONENTS[accessor.type] ?? 1);
  const start = from + offsetOf(accessor);
  if (start + total * size > to) fail('malformed', `accessor ${index} overruns its buffer view`);
  return { componentType: accessor.componentType, start, total, size };
}

/** Valeurs d'un accesseur, lues en petit-boutiste (aucune contrainte d'alignement). */
function readAccessor(json: GltfJson, bin: DataView, index: number, expected: Expect): number[] {
  const { componentType, start, total, size } = locate(json, bin, index, expected);
  const read = componentReader(bin, componentType);
  return Array.from({ length: total }, (_, i) => read(start + i * size));
}

/** Attribut facultatif : absent → vide ; présent → de la longueur attendue, sinon `malformed`. */
function optional(
  [json, bin]: [GltfJson, DataView],
  attribute: number | undefined,
  expected: Expect,
  length: number,
): number[] {
  if (attribute === undefined) return [];
  const values = readAccessor(json, bin, attribute, expected);
  if (values.length !== length) fail('malformed', `${expected.label} does not match POSITION`);
  return values;
}

function layerOf(name: string, primitive: Primitive, json: GltfJson, bin: DataView): DrapedLayer {
  const { POSITION: position, NORMAL: normal, _EASE_MM: ease } = primitive.attributes;
  if (position === undefined || primitive.indices === undefined)
    fail('malformed', `${name}: no geometry`);
  const raw = readAccessor(json, bin, position as number, VEC3);
  const count = raw.length / 3;
  const index = readAccessor(json, bin, primitive.indices as number, SCALAR_INDEX);
  if (index.length % 3 !== 0) fail('malformed', `${name}: index count is not a multiple of 3`);
  if (index.some((i) => i >= count)) fail('malformed', `${name}: index out of range`);
  const source: [GltfJson, DataView] = [json, bin];
  const normals = optional(source, normal, NORMAL, raw.length);
  const easeMm = optional(source, ease, SCALAR_FLOAT, count);
  return {
    name,
    positions: Float32Array.from(raw, (v) => v * METERS_TO_SCENE),
    normals: Float32Array.from(normals),
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
