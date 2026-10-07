import type { PointMm } from './types.js';

/**
 * Nœuds positifs de la quadrature de Gauss-Legendre à 24 points (les négatifs sont leurs opposés) et poids associés.
 * Ce sont ceux dont FreeSewing (bezier-js) se sert pour la longueur d'une courbe : nos longueurs concordent avec
 * ses `store` (longueur d'emmanchure, de tête de manche) à 1e-9 mm près. Valeurs écrites en dur : aucune fonction
 * trigonométrique, donc le même résultat dans tous les moteurs JavaScript.
 */
const NODES = [
  0.06405689286260563, 0.1911188674736163, 0.3150426796961634, 0.4337935076260451,
  0.5454214713888396, 0.6480936519369755, 0.7401241915785544, 0.820001985973903, 0.8864155270044011,
  0.9382745520027328, 0.9747285559713095, 0.9951872199970213,
] as const;

const WEIGHTS = [
  0.12793819534675216, 0.1258374563468283, 0.12167047292780339, 0.1155056680537256,
  0.10744427011596563, 0.09761865210411388, 0.08619016153195327, 0.0733464814110803,
  0.05929858491543678, 0.04427743881741981, 0.028531388628933663, 0.0123412297999872,
] as const;

/** Distance entre deux points. `Math.sqrt` seulement : `Math.hypot` n'est pas exact au bit près partout. */
export function distanceMm(a: PointMm, b: PointMm): number {
  const dx = b.xMm - a.xMm;
  const dy = b.yMm - a.yMm;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Courbe de Bézier cubique : points de départ et d'arrivée, points de contrôle. */
export interface Cubic {
  readonly p0: PointMm;
  readonly c1: PointMm;
  readonly c2: PointMm;
  readonly p3: PointMm;
}

/** Vitesse |B'(t)| d'une courbe de Bézier cubique. */
function speed(curve: Cubic, t: number): number {
  const { p0, c1, c2, p3 } = curve;
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  const dx = a * (c1.xMm - p0.xMm) + b * (c2.xMm - c1.xMm) + c * (p3.xMm - c2.xMm);
  const dy = a * (c1.yMm - p0.yMm) + b * (c2.yMm - c1.yMm) + c * (p3.yMm - c2.yMm);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Longueur d'une courbe de Bézier cubique de `p0` à `p3` (points de contrôle `c1` et `c2`). */
export function cubicLengthMm(p0: PointMm, c1: PointMm, c2: PointMm, p3: PointMm): number {
  const curve: Cubic = { p0, c1, c2, p3 };
  let sum = 0;
  for (let i = 0; i < NODES.length; i++) {
    const half = 0.5 * (NODES[i] as number);
    const weight = WEIGHTS[i] as number;
    sum += weight * (speed(curve, 0.5 - half) + speed(curve, 0.5 + half));
  }
  return 0.5 * sum;
}

/** Point à la fraction `t` du segment de `a` à `b`. */
export const lerp = (a: PointMm, b: PointMm, t: number): PointMm => ({
  xMm: a.xMm + (b.xMm - a.xMm) * t,
  yMm: a.yMm + (b.yMm - a.yMm) * t,
});

/** Coupe une courbe de Bézier cubique au paramètre `t` (de Casteljau) : la partie avant `t`, puis la partie après. */
export function splitCubic(curve: Cubic, t: number): readonly [Cubic, Cubic] {
  const { p0, c1, c2, p3 } = curve;
  const a = lerp(p0, c1, t);
  const b = lerp(c1, c2, t);
  const c = lerp(c2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const middle = lerp(d, e, t);
  return [
    { p0, c1: a, c2: d, p3: middle },
    { p0: middle, c1: e, c2: c, p3 },
  ];
}

/** Point de la courbe au paramètre `t`. */
export const cubicPointAt = (curve: Cubic, t: number): PointMm => splitCubic(curve, t)[0].p3;

/** Pas de la dichotomie de `parameterAtLength` : 2⁻⁶⁴ de l'intervalle, au-delà de la précision d'un nombre à virgule. */
const BISECTION_STEPS = 64;

/** Paramètre `t` où l'arc de 0 à `t` mesure `lengthMm` ; la longueur de l'arc croît avec `t`. */
export function parameterAtLength(curve: Cubic, lengthMm: number): number {
  let low = 0;
  let high = 1;
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = (low + high) / 2;
    const [arc] = splitCubic(curve, middle);
    if (cubicLengthMm(arc.p0, arc.c1, arc.c2, arc.p3) < lengthMm) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
