/*
 * Géométrie pure : produits vectoriels, enveloppe convexe, axe principal d'un nuage de points,
 * bornes en hauteur. Aucune dépendance au modèle MakeHuman.
 */
import type { Vec2, Vec3 } from './types.js';

const get = <T>(a: readonly T[], i: number): T => a[i] as T;

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Produit vectoriel de trois points 2D : positif si o, a, b tournent dans le sens direct. */
const cross2 = (o: Vec2, a: Vec2, b: Vec2): number =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Une moitié de l'enveloppe (chaîne monotone d'Andrew). */
function halfHull(points: Vec2[]): Vec2[] {
  const chain: Vec2[] = [];
  for (const q of points) {
    while (
      chain.length >= 2 &&
      cross2(get(chain, chain.length - 2), get(chain, chain.length - 1), q) <= 0
    ) {
      chain.pop();
    }
    chain.push(q);
  }
  return chain;
}

/**
 * Enveloppe convexe d'un nuage 2D et son périmètre. Moins de trois points : périmètre NaN (comme
 * le code d'origine : les comparaisons restent inertes, aucune reprise n'est déclenchée), hull vide.
 */
export function hullPerimeter(pts: Vec2[]): { per: number; hull: Vec2[] } {
  if (pts.length < 3) return { per: Number.NaN, hull: [] };
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lo = halfHull(p);
  const up = halfHull(p.slice().reverse());
  const hull = lo.slice(0, -1).concat(up.slice(0, -1));
  let per = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = get(hull, i);
    const b = get(hull, (i + 1) % hull.length);
    per += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return { per, hull };
}

/** Centre de gravité d'un nuage de points 3D. */
export function meanPoint(pts: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  for (const p of pts) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / pts.length, c[1] / pts.length, c[2] / pts.length];
}

type Mat3 = [Vec3, Vec3, Vec3];

function covariance(pts: Vec3[], mean: Vec3): Mat3 {
  const c: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of pts) {
    const d: Vec3 = [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]];
    for (const i of [0, 1, 2] as const) {
      for (const j of [0, 1, 2] as const) c[i][j] += d[i] * d[j];
    }
  }
  return c;
}

/** Axe principal (plus grande étendue) d'un nuage de points : direction du bras, vers le haut. */
export function axisOf(pts: Vec3[]): Vec3 {
  const c = covariance(pts, meanPoint(pts));
  let v: Vec3 = [1, -1, 0];
  for (let k = 0; k < 60; k++) {
    const w: Vec3 = [dot(c[0], v), dot(c[1], v), dot(c[2], v)];
    const l = Math.hypot(...w) || 1;
    v = [w[0] / l, w[1] / l, w[2] / l];
  }
  return v[1] < 0 ? [-v[0], -v[1], -v[2]] : v;
}

/** Plus petite et plus grande hauteur (y) d'un maillage à plat (x, y, z). */
export function bounds(pos: ArrayLike<number>): { minY: number; maxY: number } {
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < pos.length; i += 3) {
    const y = pos[i] as number;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minY, maxY };
}
