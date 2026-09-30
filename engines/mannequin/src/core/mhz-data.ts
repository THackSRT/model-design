/*
 * Lecture des données MakeHuman : gzip, puis binaire (en-tête JSON, maillage de base, UV, triangles,
 * cibles de morphing, poids de peau des bras). Construit par tools/build_makehuman.py.
 */
import type { MhData, MhHeader } from './types.js';

type TypedCtor<T> = { new (buffer: ArrayBuffer): T; BYTES_PER_ELEMENT: number };

/** Décompresse les données gzip ; déjà décompressées en route (Content-Encoding: gzip) : rien à faire. */
export async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }
  throw new Error('Décompression gzip indisponible dans ce navigateur');
}

/** Curseur de lecture : chaque lecture rend une copie alignée et avance. */
class Reader {
  off: number;
  constructor(
    private readonly buf: Uint8Array,
    start: number,
  ) {
    this.off = start;
  }

  take<T>(Type: TypedCtor<T>, n: number): T {
    const size = n * Type.BYTES_PER_ELEMENT;
    const bytes = this.buf.slice(this.off, this.off + size);
    this.off += size;
    return new Type(bytes.buffer as ArrayBuffer);
  }

  /** Aligne le curseur sur 2 octets. */
  padTo2(): void {
    if (this.off % 2) this.off++;
  }
}

function readHeader(buf: Uint8Array): { header: MhHeader; start: number } {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const hl = dv.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + hl))) as MhHeader;
  let start = 4 + hl;
  while (start % 4) start++;
  return { header, start };
}

/** Décode le binaire MakeHuman décompressé. */
export function parse(buf: Uint8Array): MhData {
  const { header, start } = readHeader(buf);
  const r = new Reader(buf, start);
  const base = r.take(Float32Array, header.nBase * 3);
  const uv = r.take(Float32Array, header.nRender * 2);
  const rv2b = r.take(Uint16Array, header.nRender);
  r.padTo2();
  const tris = r.take(Uint16Array, header.nTris * 3);
  const targets: MhData['targets'] = {};
  for (const t of header.targets) {
    const idx = r.take(Uint16Array, t.n);
    const d = r.take(Int16Array, t.n * 3);
    targets[t.name] = { idx, d };
  }
  const readArm = (n: number): MhData['arm']['L'] => {
    const idx = r.take(Uint16Array, n);
    const w = r.take(Uint8Array, n);
    if (n % 2) r.off++;
    return { idx, w };
  };
  const arm = { L: readArm(header.arm.L), R: readArm(header.arm.R) };
  return { header, base, uv, rv2b, tris, targets, arm, joints: header.joints, q: header.quant };
}
