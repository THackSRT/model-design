import type { BodyMesh } from '../core/types.js';

/** Un sommet dédoublé aux coutures UV du rendu : deux sommets au même point (au micron près) n'en font qu'un. */
const WELD_CM = 1e-3;
/** Conversion du moteur mannequin (cm) vers le moteur de drapé (mm) : la seule du moteur. */
const MM_PER_CM = 10;

/**
 * Maillage du corps du mannequin (cm, sommets dédoublés aux coutures UV) → `BodyMesh` en mm, sommets soudés : un
 * maillage fermé dont chaque arête sert à deux triangles. Les triangles réduits à une arête ou un point par la
 * soudure sont retirés. Ordre des sommets : celui de leur première apparition (déterministe).
 */
export function weldBody(positionsCm: Float32Array, index: ArrayLike<number>): BodyMesh {
  const ids = new Map<string, number>();
  const remap = new Uint32Array(positionsCm.length / 3);
  const kept: number[] = [];
  for (let v = 0; v < remap.length; v++) {
    const q = [0, 1, 2].map((k) => Math.round((positionsCm[3 * v + k] as number) / WELD_CM));
    const key = q.join(',');
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
      for (let k = 0; k < 3; k++) kept.push((positionsCm[3 * v + k] as number) * MM_PER_CM);
    }
    remap[v] = id;
  }
  const triangles: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    const a = remap[index[t] as number] as number;
    const b = remap[index[t + 1] as number] as number;
    const c = remap[index[t + 2] as number] as number;
    if (a !== b && b !== c && a !== c) triangles.push(a, b, c);
  }
  return { positionsMm: Float64Array.from(kept), triangles: Uint32Array.from(triangles) };
}
