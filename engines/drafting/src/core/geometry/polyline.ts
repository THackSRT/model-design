import { itemAt, ringItemAt } from './access.js';
import { GeometryError } from './errors.js';
import type { NearestPoint, PointMm, PolylineMm } from './types.js';
import { distanceMm, dotProduct, lerpPoint, normalize, subtractPoints } from './vector.js';

/** Demi-largeur de la corde qui donne la tangente : celle du point 1 mm avant au point 1 mm après. */
const TANGENT_HALF_WINDOW_MM = 1;

/** Longueur d'une polyligne : somme de ses segments (0 pour zéro ou un point). */
export function polylineLengthMm(points: PolylineMm): number {
  let totalMm = 0;
  for (let i = 1; i < points.length; i++) {
    totalMm += distanceMm(itemAt(points, i - 1), itemAt(points, i));
  }
  return totalMm;
}

/**
 * Point à l'abscisse curviligne `lengthMm` (longueur parcourue depuis le premier point). Borné : avant le début, le
 * premier point ; au-delà de la fin, le dernier. À l'abscisse d'un sommet (somme des segments, dans l'ordre), rend ce
 * sommet lui-même. Une polyligne vide est une erreur.
 */
export function pointAt(points: PolylineMm, lengthMm: number): PointMm {
  const first = itemAt(points, 0);
  if (lengthMm <= 0) return first;
  let walkedMm = 0;
  for (let i = 1; i < points.length; i++) {
    const from = itemAt(points, i - 1);
    const to = itemAt(points, i);
    const segmentMm = distanceMm(from, to);
    const reachedMm = walkedMm + segmentMm;
    // Ici `walkedMm < lengthMm <= reachedMm` : le segment n'est jamais nul, la division est sûre.
    if (reachedMm >= lengthMm) {
      return reachedMm === lengthMm ? to : lerpPoint(from, to, (lengthMm - walkedMm) / segmentMm);
    }
    walkedMm = reachedMm;
  }
  return itemAt(points, points.length - 1);
}

/**
 * Tangente unitaire à l'abscisse `lengthMm`, prise sur la corde de ± 1 mm autour du point (les extrémités se contentent
 * de ce qui reste de polyligne d'un côté). Nulle pour une polyligne réduite à un point, et à plus d'un millimètre
 * hors de la polyligne.
 */
export function tangentAt(points: PolylineMm, lengthMm: number): PointMm {
  const before = pointAt(points, Math.max(0, lengthMm - TANGENT_HALF_WINDOW_MM));
  const after = pointAt(points, lengthMm + TANGENT_HALF_WINDOW_MM);
  return normalize(subtractPoints(after, before));
}

/**
 * Portion d'une polyligne entre deux abscisses curvilignes : le point à `fromMm`, les sommets strictement entre les
 * deux, le point à `toMm`. Les abscisses sont bornées comme pour `pointAt` ; la fin n'est jamais rendue deux fois.
 * `fromMm` doit être inférieur ou égal à `toMm` (sinon, seuls les deux points extrêmes sont rendus).
 */
export function slicePolyline(points: PolylineMm, fromMm: number, toMm: number): PointMm[] {
  const endMm = Math.min(toMm, polylineLengthMm(points));
  const portion = [pointAt(points, fromMm)];
  let walkedMm = 0;
  for (let i = 1; i < points.length; i++) {
    walkedMm += distanceMm(itemAt(points, i - 1), itemAt(points, i));
    if (walkedMm > fromMm && walkedMm < endMm) portion.push(itemAt(points, i));
  }
  portion.push(pointAt(points, endMm));
  return portion;
}

/**
 * Rééchantillonnage régulier : points équidistants en abscisse curviligne, le premier et le dernier étant ceux de la
 * polyligne. Le nombre de segments est celui qui approche le mieux le pas (au moins 1) ; le pas réel en diffère donc.
 * Le pas doit être un nombre fini supérieur à 0 (`GeometryError` sinon).
 */
export function resamplePolyline(points: PolylineMm, stepMm: number): PointMm[] {
  if (!Number.isFinite(stepMm) || stepMm <= 0) {
    throw new GeometryError('invalid-argument', 'the resampling step must be a number above 0');
  }
  const totalMm = polylineLengthMm(points);
  const count = Math.max(1, Math.round(totalMm / stepMm));
  const last = itemAt(points, points.length - 1);
  return Array.from({ length: count + 1 }, (_, i) =>
    i === count ? last : pointAt(points, (totalMm * i) / count),
  );
}

/** Mêmes points dans l'ordre inverse, dans un nouveau tableau. */
export function reversePoints(points: readonly PointMm[]): PointMm[] {
  return [...points].reverse();
}

/** Fraction (0 à 1) du segment de `from` à `to` où tombe la projection de `target`, bornée aux extrémités. */
function projectionRatio(from: PointMm, to: PointMm, target: PointMm): number {
  const edge = subtractPoints(to, from);
  const squaredMm2 = dotProduct(edge, edge);
  if (squaredMm2 === 0) return 0;
  const ratio = dotProduct(subtractPoints(target, from), edge) / squaredMm2;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Point de la polyligne le plus proche de `target`, avec sa distance et son abscisse curviligne. À égalité, le premier
 * rencontré. Avec `closed`, le segment qui relie le dernier point au premier compte aussi (contour d'un polygone).
 * Une liste vide est une erreur.
 */
export function nearestPointOnPolyline(
  points: PolylineMm,
  target: PointMm,
  closed = false,
): NearestPoint {
  const first = itemAt(points, 0);
  let best: NearestPoint = { point: first, distanceMm: distanceMm(first, target), lengthMm: 0 };
  let walkedMm = 0;
  const segmentCount = closed ? points.length : points.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    const from = itemAt(points, i);
    const to = ringItemAt(points, i + 1);
    const ratio = projectionRatio(from, to, target);
    const candidate = lerpPoint(from, to, ratio);
    const gapMm = distanceMm(candidate, target);
    const segmentMm = distanceMm(from, to);
    if (gapMm < best.distanceMm) {
      best = { point: candidate, distanceMm: gapMm, lengthMm: walkedMm + ratio * segmentMm };
    }
    walkedMm += segmentMm;
  }
  return best;
}
