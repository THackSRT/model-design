/*
 * Zones de mesure (mètre ruban) : sommets touchés par la cible de mensuration correspondante.
 */
import { PAIRS } from './morph.js';
import type { MhData, Region } from './types.js';

/** Zones mesurées, dans l'ordre. Bras et jambes : zones doubles (gauche et droite). */
export const REGION_KEYS = [
  'neck',
  'chest',
  'underbust',
  'waist',
  'hip',
  'bicep',
  'wrist',
  'thigh',
  'knee',
  'calf',
  'ankle',
] as const;

/** Part du déplacement maximal à partir de laquelle un sommet fait partie de la bande de mesure. */
const BAND_SHARE = 0.7;

function buildRegion(data: MhData, key: string): Region {
  const t = data.targets[`${PAIRS[key]}-incr`];
  if (!t) throw new Error(`Cible de mensuration absente : ${key}`);
  const inRegion = new Uint8Array(data.header.nBase);
  t.idx.forEach((i) => {
    inRegion[i] = 1;
  });
  // bande de mesure : sommets les plus déplacés par la cible (la ligne du mètre ruban)
  const mag = Array.from(t.idx, (_, k) =>
    Math.hypot(t.d[3 * k] as number, t.d[3 * k + 1] as number, t.d[3 * k + 2] as number),
  );
  const mx = Math.max(...mag);
  const band = Array.from(t.idx).filter((_, k) => (mag[k] as number) >= BAND_SHARE * mx);
  return { verts: Array.from(t.idx), band, inRegion };
}

export function buildRegions(data: MhData): Record<string, Region> {
  const regions: Record<string, Region> = {};
  for (const key of REGION_KEYS) regions[key] = buildRegion(data, key);
  return regions;
}

/** Triangles exprimés en sommets de base. */
export function trisToBase(data: Pick<MhData, 'tris' | 'rv2b'>): Uint16Array {
  const tb = new Uint16Array(data.tris.length);
  for (let i = 0; i < data.tris.length; i++) tb[i] = data.rv2b[data.tris[i] as number] as number;
  return tb;
}
