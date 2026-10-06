import { isNear } from './contour.js';
import { ContourError } from './errors.js';
import type { PointMm } from './types.js';

type Points = Readonly<Record<string, PointMm>>;

/** Un point dont le nom commence par `_` est temporaire chez FreeSewing : il ne sort pas du moteur. */
export const isPublicPoint = (name: string): boolean => !name.startsWith('_');

/** Les points publics d'une pièce, dans l'ordre où FreeSewing les a créés. */
export function publicPoints(points: Points): Record<string, PointMm> {
  const result: Record<string, PointMm> = {};
  for (const [name, point] of Object.entries(points)) {
    if (isPublicPoint(name)) result[name] = point;
  }
  return result;
}

/** Un point public aux coordonnées non finies (NaN) trahit un tracé faux : il ne sortirait pas en JSON. */
export function assertFinitePoints(part: string, points: Points): void {
  for (const [name, point] of Object.entries(points)) {
    if (!Number.isFinite(point.xMm) || !Number.isFinite(point.yMm)) {
      throw new ContourError(part, `point "${name}" has a non-finite coordinate`);
    }
  }
}

/** Pour chaque sommet : les noms de tous les points qui s'y trouvent (à 0,01 mm près). */
export function nameVertices(vertices: readonly PointMm[], points: Points): string[][] {
  const entries = Object.entries(points);
  return vertices.map((vertex) =>
    entries.filter(([, point]) => isNear(point, vertex)).map(([name]) => name),
  );
}

/**
 * Deux points dont les coordonnées s'arrondissent au même millimètre : le critère de `Point.sitsRoughlyOn` de FreeSewing.
 * `Path.join` s'en sert pour ne pas tracer de segment minuscule : si le point de départ du second chemin « tombe
 * à peu près » sur la fin du premier, il n'est pas un sommet du contour, et le point qui y était nommé reste à quelques
 * dixièmes de millimètre du sommet voisin. Cas de Brian : `lengthBonus` très proche de 0 pose `cbHem` près de `cbHips`,
 * et le contour ne passe que par `cbHips`.
 */
export function sitsRoughlyOn(a: PointMm, b: PointMm): boolean {
  return Math.round(a.xMm) === Math.round(b.xMm) && Math.round(a.yMm) === Math.round(b.yMm);
}

/**
 * Indices des sommets qui représentent le point : ceux qui coïncident avec lui à 0,01 mm près (un contour peut repasser
 * par le même point : pince de largeur nulle) ; à défaut, ceux que FreeSewing lui a confondus (`sitsRoughlyOn`).
 */
export function vertexCandidates(vertices: readonly PointMm[], point: PointMm): number[] {
  const within = (matches: (vertex: PointMm) => boolean): number[] =>
    vertices.flatMap((vertex, index) => (matches(vertex) ? [index] : []));
  const exact = within((vertex) => isNear(vertex, point));
  return exact.length > 0 ? exact : within((vertex) => sitsRoughlyOn(vertex, point));
}
