import { itemAt } from './access.js';
import { GeometryError } from './errors.js';
import type { CubicMm, PathOpMm, PointMm, PolylineMm } from './types.js';
import { addPoints, point, scalePoint, subtractPoints } from './vector.js';

/** Segments par courbe de Bézier quand l'appelant n'en demande pas (comme l'essai des tuniques : 24). */
export const DEFAULT_CURVE_SEGMENTS = 24;

/** Segments par portion d'une courbe lissée quand l'appelant n'en demande pas. */
export const DEFAULT_SMOOTH_SEGMENTS = 12;

/** Point de la courbe de Bézier cubique à la position `t` (0 au départ, 1 à l'arrivée). */
function cubicPoint(curve: CubicMm, t: number): PointMm {
  const { from, cp1, cp2, to } = curve;
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return point(
    w0 * from.xMm + w1 * cp1.xMm + w2 * cp2.xMm + w3 * to.xMm,
    w0 * from.yMm + w1 * cp1.yMm + w2 * cp2.yMm + w3 * to.yMm,
  );
}

/**
 * Courbe de Bézier cubique échantillonnée en `segments` segments : `segments + 1` points, le premier et le dernier
 * étant le départ et l'arrivée de la courbe. `segments` doit être un entier d'au moins 1 (`GeometryError` sinon).
 */
export function sampleCubic(curve: CubicMm, segments = DEFAULT_CURVE_SEGMENTS): PointMm[] {
  if (!Number.isInteger(segments) || segments < 1) {
    throw new GeometryError(
      'invalid-argument',
      'the number of segments must be an integer of 1 or more',
    );
  }
  return Array.from({ length: segments + 1 }, (_, i) => cubicPoint(curve, i / segments));
}

/**
 * Spline de Catmull-Rom (uniforme) qui passe par tous les points donnés : chaque portion entre deux points est une
 * courbe de Bézier cubique échantillonnée en `segmentsPerSpan` segments, les extrémités se prolongeant sur elles-mêmes.
 * Rend `(n − 1) × segmentsPerSpan + 1` points, dont les points donnés aux indices multiples de `segmentsPerSpan`.
 * Avec moins de 3 points, rend une copie de l'entrée.
 */
export function smoothCatmullRom(
  points: PolylineMm,
  segmentsPerSpan = DEFAULT_SMOOTH_SEGMENTS,
): PointMm[] {
  if (points.length < 3) return [...points];
  const lastIndex = points.length - 1;
  const smoothed: PointMm[] = [itemAt(points, 0)];
  for (let i = 0; i < lastIndex; i++) {
    const p0 = itemAt(points, Math.max(0, i - 1));
    const p1 = itemAt(points, i);
    const p2 = itemAt(points, i + 1);
    const p3 = itemAt(points, Math.min(lastIndex, i + 2));
    const cp1 = addPoints(p1, scalePoint(subtractPoints(p2, p0), 1 / 6));
    const cp2 = subtractPoints(p2, scalePoint(subtractPoints(p3, p1), 1 / 6));
    smoothed.push(...sampleCubic({ from: p1, cp1, cp2, to: p2 }, segmentsPerSpan).slice(1));
  }
  return smoothed;
}

/**
 * Tracé de FreeSewing (`move`, `line`, `curve`) en polyligne : chaque courbe est échantillonnée en `segmentsPerCurve`
 * segments. Les sous-tracés se suivent sans coupure, et `close` est ignoré (un polygone se ferme de lui-même). Une courbe
 * sans point de départ est une erreur ; une ligne en premier sert de départ.
 */
export function flattenPath(
  ops: readonly PathOpMm[],
  segmentsPerCurve = DEFAULT_CURVE_SEGMENTS,
): PointMm[] {
  const flat: PointMm[] = [];
  for (const op of ops) {
    if (op.type === 'move' || op.type === 'line') {
      flat.push(op.to);
    } else if (op.type === 'curve') {
      const from = flat[flat.length - 1];
      if (from === undefined) {
        throw new GeometryError('invalid-argument', 'a curve needs a starting point');
      }
      flat.push(
        ...sampleCubic({ from, cp1: op.cp1, cp2: op.cp2, to: op.to }, segmentsPerCurve).slice(1),
      );
    }
  }
  return flat;
}
