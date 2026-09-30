import type { MeshData } from '../scene.js';
import { traceContours } from './contour.js';
import { projectVertices, type SilhouetteView } from './projection.js';
import { rasterize } from './raster.js';
import { simplifyLoop, type Vec } from './simplify.js';

export interface SilhouetteOptions {
  /** Résolution du masque, en pixels par cm (défaut 4). */
  pxPerCm?: number;
  /** Tolérance de simplification, en cm (défaut 0,15). */
  toleranceCm?: number;
}

export interface Silhouette {
  /** Chemin SVG (unités : cm), origine en haut à gauche de la boîte englobante, y vers le bas. */
  d: string;
  widthCm: number;
  heightCm: number;
}

const DEFAULTS = { pxPerCm: 4, toleranceCm: 0.15 };
const EMPTY: Silhouette = { d: '', widthCm: 0, heightCm: 0 };
const round = (v: number) => Math.round(v * 100) / 100;

function toPath(loops: readonly (readonly Vec[])[]): string {
  return loops
    .map((loop) => `M${loop.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`)
    .join('');
}

/**
 * Silhouette en trait d'un maillage (positions en cm, axe Y vertical) vue de face, de profil ou de dos :
 * projection orthographique, masque logiciel, contours par marching squares, puis Douglas-Peucker.
 */
export function silhouettePaths(
  mesh: MeshData,
  view: SilhouetteView,
  options: SilhouetteOptions = {},
): Silhouette {
  const { pxPerCm, toleranceCm } = { ...DEFAULTS, ...options };
  if (!(pxPerCm > 0)) throw new RangeError(`pxPerCm doit être > 0 (reçu ${pxPerCm}).`);
  if (!(toleranceCm >= 0))
    throw new RangeError(`toleranceCm doit être >= 0 (reçu ${toleranceCm}).`);
  const projected = projectVertices(mesh, view);
  if (!Number.isFinite(projected.minX) || mesh.index.length < 3) return EMPTY;
  const { mask, padding } = rasterize(projected, mesh.index, pxPerCm);
  // Les points du contour sont en demi-pixels, relatifs au masque (marge comprise).
  const toCm = ([u, v]: Vec): Vec => [(u / 2 - padding) / pxPerCm, (v / 2 - padding) / pxPerCm];
  const loops = traceContours(mask)
    .map((loop) => simplifyLoop(loop.map(toCm), toleranceCm))
    .filter((loop) => loop.length > 2);
  return {
    d: toPath(loops),
    widthCm: projected.maxX - projected.minX,
    heightCm: projected.maxY - projected.minY,
  };
}
