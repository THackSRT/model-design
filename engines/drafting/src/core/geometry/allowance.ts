import { itemAt, ringItemAt } from './access.js';
import { GeometryError } from './errors.js';
import { dedupePoints } from './point-set.js';
import { signedAreaMm2 } from './polygon.js';
import type { PointMm, PolygonMm } from './types.js';
import {
  addPoints,
  crossProduct,
  distanceMm,
  leftNormal,
  normalize,
  scalePoint,
  subtractPoints,
} from './vector.js';

/** Un onglet à plus de 4 fois la valeur de couture du sommet (au moins 1 mm) est remplacé par un biseau. */
const MITER_LIMIT_FACTOR = 4;
const MITER_LIMIT_FLOOR_MM = 1;

/** Deux arêtes dont le produit vectoriel des directions unitaires est plus petit sont tenues pour parallèles. */
const PARALLEL_EPSILON = 1e-6;

/** Arête décalée : ses extrémités après décalage, sa direction unitaire et la valeur de couture appliquée. */
interface ShiftedEdge {
  readonly from: PointMm;
  readonly to: PointMm;
  readonly direction: PointMm;
  readonly allowanceMm: number;
}

function shiftEdge(from: PointMm, to: PointMm, allowanceMm: number, outward: 1 | -1): ShiftedEdge {
  const direction = normalize(subtractPoints(to, from));
  const shift = scalePoint(leftNormal(direction), outward * allowanceMm);
  return { from: addPoints(from, shift), to: addPoints(to, shift), direction, allowanceMm };
}

/**
 * Point(s) du contour décalé au sommet `original`, entre l'arête décalée qui y arrive et celle qui en part : leur
 * intersection (l'onglet) ; ou, si elles sont parallèles ou si l'onglet s'éloigne trop du sommet, les deux
 * extrémités qui se font face (le biseau), que l'écart de valeur de couture transforme en redan.
 */
function cornerPoints(incoming: ShiftedEdge, outgoing: ShiftedEdge, original: PointMm): PointMm[] {
  const bevel = [incoming.to, outgoing.from];
  const turn = crossProduct(incoming.direction, outgoing.direction);
  if (Math.abs(turn) < PARALLEL_EPSILON) return bevel;
  const gap = subtractPoints(outgoing.from, incoming.from);
  const along = crossProduct(gap, outgoing.direction) / turn;
  const miter = addPoints(incoming.from, scalePoint(incoming.direction, along));
  const widest = Math.max(incoming.allowanceMm, outgoing.allowanceMm, MITER_LIMIT_FLOOR_MM);
  return distanceMm(miter, original) > MITER_LIMIT_FACTOR * widest ? bevel : [miter];
}

/**
 * Décalage d'un polygone fermé vers l'extérieur, d'une largeur par côté : le côté `i` (du point `i` au point `i + 1`)
 * est reculé de `allowancesMm[i]`, d'où les valeurs de couture d'un patron (couture, ourlet, pli à zéro). Aux
 * sommets, les côtés décalés se rejoignent par un onglet ; un biseau le remplace quand l'onglet s'éloigne de plus de
 * 4 fois la valeur de couture (au moins 1 mm), et deux côtés alignés de largeurs différentes laissent un redan. Les
 * points confondus sont ensuite retirés (`dedupePoints`) : le résultat n'a pas toujours autant de points que le
 * polygone. Il faut une valeur positive ou nulle par côté (`GeometryError` si le nombre est faux), et aucun côté de
 * longueur nulle : passer d'abord le polygone par `dedupePoints(polygon, true)`.
 */
export function outsetPolygonPerEdge(
  polygon: PolygonMm,
  allowancesMm: readonly number[],
): PointMm[] {
  if (allowancesMm.length !== polygon.length) {
    throw new GeometryError('invalid-argument', 'one allowance per polygon edge is required');
  }
  const outward = signedAreaMm2(polygon) > 0 ? 1 : -1;
  const edges = allowancesMm.map((allowanceMm, i) =>
    shiftEdge(itemAt(polygon, i), ringItemAt(polygon, i + 1), allowanceMm, outward),
  );
  const corners = polygon.flatMap((original, i) =>
    cornerPoints(ringItemAt(edges, i - 1), itemAt(edges, i), original),
  );
  return dedupePoints(corners, true);
}
