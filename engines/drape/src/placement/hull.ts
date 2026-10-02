import type { P2 } from './types.js';

// Géométrie plane de la mise en place : enveloppe convexe, courbe décalée, abscisse curviligne. Pur, déterministe
// (+ − × ÷, sqrt, floor, min, max : pas de trigonométrie).

const cross = (o: P2, a: P2, b: P2): number =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Enveloppe convexe (chaîne monotone d'Andrew), sens antihoraire (a vers la droite, b vers le haut), sans point aligné. */
export function convexHull(points: readonly P2[]): P2[] {
  const sorted = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (sorted.length < 3) return sorted;
  const chain = (list: readonly P2[]): P2[] => {
    const out: P2[] = [];
    for (const p of list) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2] as P2, out[out.length - 1] as P2, p) <= 0
      ) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...chain(sorted), ...chain(sorted.slice().reverse())];
}

/** Courbe fermée convexe parcourue dans le sens horaire (a à droite, b en haut), avec abscisses curvilignes. */
export interface Curve {
  points: P2[];
  /** Abscisse du point i ; `cumulative[n]` = longueur totale. */
  cumulative: Float64Array;
  length: number;
}

const unit = (x: number, y: number): P2 => {
  const l = Math.sqrt(x * x + y * y) || 1;
  return [x / l, y / l];
};

/** Pas d'arc d'un coin : environ 20 degrés au plus (angle estimé sans trigonométrie, exact pour un petit angle). */
function arcSteps(dot: number): number {
  const angle = Math.sqrt(Math.max(0, 2 * (1 - dot)));
  return Math.max(1, Math.ceil(angle * 3));
}

/** Points décalés de `clearance` autour du sommet `p` entre les normales sortantes `from` et `to`. */
function arc(p: P2, from: P2, to: P2, clearance: number): P2[] {
  const steps = arcSteps(from[0] * to[0] + from[1] * to[1]);
  const out: P2[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const n = unit(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    out.push([p[0] + clearance * n[0], p[1] + clearance * n[1]]);
  }
  return out;
}

/** Courbe à `clearance` de l'enveloppe `hull` (antihoraire) : arêtes décalées et coins arrondis. */
export function offsetCurve(hull: readonly P2[], clearance: number): Curve {
  const n = hull.length;
  const normals = hull.map((p, i) => {
    const q = hull[(i + 1) % n] as P2;
    return unit(q[1] - p[1], p[0] - q[0]); // sortante pour un polygone antihoraire
  });
  const ccw: P2[] = [];
  hull.forEach((p, i) => {
    const prev = normals[(i + n - 1) % n] as P2;
    ccw.push(...arc(p, prev, normals[i] as P2, clearance));
  });
  const points = ccw.reverse();
  const cumulative = new Float64Array(points.length + 1);
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as P2;
    const q = points[(i + 1) % points.length] as P2;
    cumulative[i + 1] =
      (cumulative[i] as number) + Math.sqrt((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2);
  }
  return { points, cumulative, length: cumulative[points.length] as number };
}

/** Point de la courbe à l'abscisse `s` (périodique : la courbe est fermée). */
export function pointAt(curve: Curve, s: number): P2 {
  const { points, cumulative, length } = curve;
  const t = s - length * Math.floor(s / length);
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((cumulative[mid] as number) <= t) lo = mid;
    else hi = mid - 1;
  }
  const p = points[lo] as P2;
  const q = points[(lo + 1) % points.length] as P2;
  const span = (cumulative[lo + 1] as number) - (cumulative[lo] as number);
  const w = span > 0 ? (t - (cumulative[lo] as number)) / span : 0;
  return [p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w];
}

/** Moyenne des sommets : un point intérieur d'une courbe convexe. */
export function centroid(points: readonly P2[]): P2 {
  let a = 0;
  let b = 0;
  for (const p of points) {
    a += p[0];
    b += p[1];
  }
  return [a / points.length, b / points.length];
}

/** Abscisse du point de la courbe le plus loin dans la direction (da, db) ; premier en cas d'égalité. */
export function extremeArc(curve: Curve, dir: P2): number {
  let best = -Infinity;
  let at = 0;
  curve.points.forEach((p, i) => {
    const value = p[0] * dir[0] + p[1] * dir[1];
    if (value > best) {
      best = value;
      at = i;
    }
  });
  return curve.cumulative[at] as number;
}

/**
 * Abscisse du point de la courbe sur la droite a = 0, côté b maximal (`front`) ou minimal ; -1 si la courbe ne
 * coupe pas la droite.
 */
export function midlineArc(curve: Curve, front: boolean): number {
  const { points } = curve;
  let bestB = front ? -Infinity : Infinity;
  let bestArc = -1;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length] as P2;
    if (p[0] === q[0] || (p[0] > 0 && q[0] > 0) || (p[0] < 0 && q[0] < 0)) return;
    const w = -p[0] / (q[0] - p[0]);
    const b = p[1] + (q[1] - p[1]) * w;
    if (front ? b > bestB : b < bestB) {
      bestB = b;
      bestArc =
        (curve.cumulative[i] as number) +
        w * ((curve.cumulative[i + 1] as number) - (curve.cumulative[i] as number));
    }
  });
  return bestArc;
}
