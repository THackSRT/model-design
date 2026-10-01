/*
 * Anneau de vêtement : section du corps (enveloppe convexe) agrandie jusqu'au tour fini.
 * L'anneau est la somme de Minkowski de l'enveloppe et d'un disque de rayon d : il reste à une distance
 * d du corps partout (jamais à l'intérieur), son tour vaut le tour du corps + 2πd, et il tend vers un
 * cercle quand d grandit (jupe évasée). Échantillonné par directions régulières pour que deux anneaux
 * se correspondent sommet à sommet. Unités : cm.
 */
import type { Vec2 } from '../core/types.js';

/** Écart minimal entre le tissu et le corps (cm) : l'épaisseur du tissu. */
export const MIN_GAP_CM = 0.05;
const NEWTON_STEPS = 4;

export const perimeter = (pts: Vec2[]): number => {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as Vec2;
    const b = pts[(i + 1) % pts.length] as Vec2;
    sum += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return sum;
};

/** Directions unitaires régulières, de +x vers +z. */
export function directions(n: number): Vec2[] {
  return Array.from({ length: n }, (_, k): Vec2 => {
    const a = (2 * Math.PI * k) / n;
    return [Math.cos(a), Math.sin(a)];
  });
}

/** Point de l'enveloppe le plus avancé dans chaque direction (fonction d'appui), dans l'ordre. */
export function supportPoints(hull: Vec2[], dirs: Vec2[]): Vec2[] {
  return dirs.map((d) => {
    let best = hull[0] as Vec2;
    let bestDot = -Infinity;
    for (const p of hull) {
      const dot = p[0] * d[0] + p[1] * d[1];
      if (dot > bestDot) {
        bestDot = dot;
        best = p;
      }
    }
    return best;
  });
}

const offset = (support: Vec2[], dirs: Vec2[], d: number): Vec2[] =>
  support.map((p, k): Vec2 => [p[0] + d * (dirs[k] as Vec2)[0], p[1] + d * (dirs[k] as Vec2)[1]]);

export interface SolvedRing {
  points: Vec2[];
  /** Tour du corps à cette hauteur (cm), sur les mêmes directions. */
  bodyGirthCm: number;
  /** Écart (cm) entre le tour du corps et le tour fini demandé, 0 si le tissu passe. */
  shortfallCm: number;
}

/**
 * Anneau dont le tour vaut `targetCm`, autour de l'enveloppe `hull`. Si le tour demandé est
 * inférieur à celui du corps, l'anneau est collé au corps (écart minimal) et `shortfallCm` donne la différence.
 */
export function solveRing(hull: Vec2[], dirs: Vec2[], targetCm: number): SolvedRing {
  const support = supportPoints(hull, dirs);
  const body = perimeter(support);
  let d = Math.max(MIN_GAP_CM, (targetCm - body) / (2 * Math.PI));
  if (targetCm > body) {
    for (let i = 0; i < NEWTON_STEPS; i++) {
      d = Math.max(
        MIN_GAP_CM,
        d + (targetCm - perimeter(offset(support, dirs, d))) / (2 * Math.PI),
      );
    }
  }
  return {
    points: offset(support, dirs, d),
    bodyGirthCm: body,
    shortfallCm: Math.max(0, body - targetCm),
  };
}
