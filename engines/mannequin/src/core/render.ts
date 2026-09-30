/*
 * Géométrie de rendu : sommets dupliqués aux coutures UV, normales lissées sur la topologie de base.
 */
import type { MakeHumanGeometry, MhModel } from './types.js';

type RenderData = Pick<MhModel, 'trisBase' | 'rv2b' | 'tris' | 'uv'>;

/** Normales lissées sur la topologie de base (pas de cassure aux coutures UV), non normalisées. */
function baseNormals(pos: Float32Array, tris: Uint16Array): Float32Array {
  const N = new Float32Array(pos.length);
  for (let t = 0; t < tris.length; t += 3) {
    const a = 3 * (tris[t] as number);
    const b = 3 * (tris[t + 1] as number);
    const c = 3 * (tris[t + 2] as number);
    const ux = (pos[b] as number) - (pos[a] as number);
    const uy = (pos[b + 1] as number) - (pos[a + 1] as number);
    const uz = (pos[b + 2] as number) - (pos[a + 2] as number);
    const vx = (pos[c] as number) - (pos[a] as number);
    const vy = (pos[c + 1] as number) - (pos[a + 1] as number);
    const vz = (pos[c + 2] as number) - (pos[a + 2] as number);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) {
      N[i] = (N[i] as number) + nx;
      N[i + 1] = (N[i + 1] as number) + ny;
      N[i + 2] = (N[i + 2] as number) + nz;
    }
  }
  return N;
}

/** Triangles de rendu dont aucun sommet n'est marqué dans `drop` (sommets de base). */
function keepTriangles(data: RenderData, drop: Uint8Array): Uint16Array {
  const { tris, rv2b } = data;
  const keep: number[] = [];
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] as number;
    const b = tris[t + 1] as number;
    const c = tris[t + 2] as number;
    if (drop[rv2b[a] as number] || drop[rv2b[b] as number] || drop[rv2b[c] as number]) continue;
    keep.push(a, b, c);
  }
  return Uint16Array.from(keep);
}

/** Géométrie à afficher ; `drop` : sommets de base à ne pas afficher (globes oculaires). */
export function renderGeometry(
  data: RenderData,
  pos: Float32Array,
  drop?: Uint8Array,
): MakeHumanGeometry {
  const N = baseNormals(pos, data.trisBase);
  const n = data.rv2b.length;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const j = (data.rv2b[i] as number) * 3;
    positions[3 * i] = pos[j] as number;
    positions[3 * i + 1] = pos[j + 1] as number;
    positions[3 * i + 2] = pos[j + 2] as number;
    const l = Math.hypot(N[j] as number, N[j + 1] as number, N[j + 2] as number) || 1;
    normals[3 * i] = (N[j] as number) / l;
    normals[3 * i + 1] = (N[j + 1] as number) / l;
    normals[3 * i + 2] = (N[j + 2] as number) / l;
  }
  // Tableaux neufs : le modèle en cache ne doit jamais être exposé (l'appelant peut les transférer).
  const index = drop ? keepTriangles(data, drop) : data.tris.slice();
  return { positions, normals, uvs: data.uv.slice(), index };
}
