import type { PointMm } from './types.js';

/** Point de coordonnées `xMm` et `yMm`. */
export function point(xMm: number, yMm: number): PointMm {
  return { xMm, yMm };
}

export function addPoints(a: PointMm, b: PointMm): PointMm {
  return point(a.xMm + b.xMm, a.yMm + b.yMm);
}

export function subtractPoints(a: PointMm, b: PointMm): PointMm {
  return point(a.xMm - b.xMm, a.yMm - b.yMm);
}

/** Vecteur `p` multiplié par `factor`. */
export function scalePoint(p: PointMm, factor: number): PointMm {
  return point(p.xMm * factor, p.yMm * factor);
}

/** Point à la fraction `t` du segment de `a` à `b` : 0 donne `a`, 1 donne `b` ; hors de 0 à 1, il prolonge le segment. */
export function lerpPoint(a: PointMm, b: PointMm, t: number): PointMm {
  return point(a.xMm + (b.xMm - a.xMm) * t, a.yMm + (b.yMm - a.yMm) * t);
}

/** Distance entre deux points. `Math.sqrt` seulement : `Math.hypot` n'est pas exact au bit près partout. */
export function distanceMm(a: PointMm, b: PointMm): number {
  const dx = b.xMm - a.xMm;
  const dy = b.yMm - a.yMm;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Produit scalaire de deux vecteurs. */
export function dotProduct(a: PointMm, b: PointMm): number {
  return a.xMm * b.xMm + a.yMm * b.yMm;
}

/**
 * Produit vectoriel (composante z) de deux vecteurs : positif quand `b` est dans le sens horaire de `a`, tel qu'on le
 * voit à l'écran (y vers le bas).
 */
export function crossProduct(a: PointMm, b: PointMm): number {
  return a.xMm * b.yMm - a.yMm * b.xMm;
}

/** Vecteur unitaire de même direction ; le vecteur nul reste nul. */
export function normalize(v: PointMm): PointMm {
  const length = Math.sqrt(v.xMm * v.xMm + v.yMm * v.yMm) || 1;
  return point(v.xMm / length, v.yMm / length);
}

/** Perpendiculaire à gauche du sens de `v`, à l'écran (y vers le bas) : (1, 0) donne (0, −1), vers le haut. */
export function leftNormal(v: PointMm): PointMm {
  return point(v.yMm, -v.xMm);
}

/** Perpendiculaire à droite du sens de `v`, à l'écran (y vers le bas) : (1, 0) donne (0, 1), vers le bas. */
export function rightNormal(v: PointMm): PointMm {
  return point(-v.yMm, v.xMm);
}

/** Symétrique de `p` par rapport à la verticale `x = axisXMm` : l'axe du pli, `x = 0` dans le repère de FreeSewing. */
export function mirrorPoint(p: PointMm, axisXMm = 0): PointMm {
  return point(2 * axisXMm - p.xMm, p.yMm);
}

/** Symétriques des points, dans le même ordre (ce qui inverse le sens de parcours d'un polygone). */
export function mirrorPoints(points: readonly PointMm[], axisXMm = 0): PointMm[] {
  return points.map((p) => mirrorPoint(p, axisXMm));
}
