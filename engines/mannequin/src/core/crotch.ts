/*
 * Longueur de fourche : chemin le long du corps, dans le plan sagittal (milieu du corps), de la taille au milieu
 * devant, entre les jambes, jusqu'à la taille au milieu dos. Le plan est décalé de 0,01 mm du milieu pour ne pas
 * suivre les arêtes de la ligne médiane du maillage. Unités : cm.
 */
import { type Chain, sliceMesh } from './slice.js';
import type { Vec3 } from './types.js';

/** Décalage du plan sagittal (cm). */
const MIDLINE_OFFSET_CM = 0.001;
/**
 * Épaisseur du fond de l'arche entre les jambes (cm) : le point de fourche est le milieu de la partie du chemin
 * qui reste dans cette épaisseur au-dessus du point le plus bas (le fond de l'arche est presque plat : le point
 * le plus bas, lui, bouge de plusieurs centimètres pour un millimètre de maillage).
 */
const ARCH_BAND_CM = 0.8;

export interface CrotchPath {
  /** De la taille devant à la taille dos, par la fourche (cm). */
  totalCm: number;
  /** De la taille devant au point de fourche (cm). */
  frontCm: number;
  /** Point de fourche. */
  point: Vec3;
}

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Contour sagittal le plus bas du corps : celui qui porte la fourche. */
function lowestChain(chains: Chain[]): Chain {
  let best: Chain | undefined;
  let lowest = Infinity;
  for (const chain of chains) {
    for (const p of chain.points) {
      if (p[1] < lowest) {
        lowest = p[1];
        best = chain;
      }
    }
  }
  if (!best) throw new Error('Longueur de fourche introuvable : plan sagittal vide');
  return best;
}

/** Points du contour depuis l'indice `from`, dans le sens `dir`, jusqu'à la hauteur `waistY` (point interpolé inclus). */
function climbTo(points: Vec3[], from: number, dir: 1 | -1, waistY: number): Vec3[] {
  const n = points.length;
  const path = [points[from] as Vec3];
  for (let k = 1; k < n; k++) {
    const a = points[(from + dir * (k - 1) + n) % n] as Vec3;
    const b = points[(from + dir * k + n) % n] as Vec3;
    if (b[1] < waistY) {
      path.push(b);
      continue;
    }
    const f = (waistY - a[1]) / (b[1] - a[1]);
    path.push([a[0] + (b[0] - a[0]) * f, waistY, a[2] + (b[2] - a[2]) * f]);
    return path;
  }
  throw new Error('Longueur de fourche introuvable : le contour sagittal ne monte pas à la taille');
}

/** Abscisses curvilignes cumulées d'un chemin (cm), la première vaut 0. */
function arcLengths(path: Vec3[]): number[] {
  const s = [0];
  for (let i = 1; i < path.length; i++) {
    s.push((s[i - 1] as number) + dist(path[i - 1] as Vec3, path[i] as Vec3));
  }
  return s;
}

/** Point du chemin à l'abscisse curviligne `target`. */
function pointAt(path: Vec3[], s: number[], target: number): Vec3 {
  let i = 1;
  while (i < path.length - 1 && (s[i] as number) < target) i++;
  const a = path[i - 1] as Vec3;
  const b = path[i] as Vec3;
  const span = (s[i] as number) - (s[i - 1] as number);
  const f = span > 0 ? (target - (s[i - 1] as number)) / span : 0;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Chemin de la fourche entre la taille devant et la taille dos (hauteur `waistY`, cm). Devant : côté z > 0.
 */
export function crotchPath(pos: Float32Array, tris: ArrayLike<number>, waistY: number): CrotchPath {
  const chain = lowestChain(sliceMesh(pos, tris, 0, MIDLINE_OFFSET_CM));
  const points = chain.points;
  let low = 0;
  points.forEach((p, i) => {
    if (p[1] < (points[low] as Vec3)[1]) low = i;
  });
  const up = climbTo(points, low, 1, waistY);
  const down = climbTo(points, low, -1, waistY);
  const [front, back] =
    (up[up.length - 1] as Vec3)[2] > (down[down.length - 1] as Vec3)[2] ? [up, down] : [down, up];
  const path = [...front.slice().reverse(), ...back.slice(1)];
  const s = arcLengths(path);
  const bottom = (points[low] as Vec3)[1] + ARCH_BAND_CM;
  const arch = s.filter((_, i) => (path[i] as Vec3)[1] <= bottom);
  const middle = ((arch[0] as number) + (arch[arch.length - 1] as number)) / 2;
  return { totalCm: s[s.length - 1] as number, frontCm: middle, point: pointAt(path, s, middle) };
}
