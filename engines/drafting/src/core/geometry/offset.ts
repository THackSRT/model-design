import { itemAt, ringItemAt } from './access.js';
import { signedAreaMm2 } from './polygon.js';
import type { PointMm, PolygonMm, PolylineMm } from './types.js';
import {
  addPoints,
  dotProduct,
  leftNormal,
  normalize,
  scalePoint,
  subtractPoints,
} from './vector.js';

/**
 * Plus petit cosinus retenu entre la bissectrice et la normale d'un côté (le sinus de la moitié de l'angle du sommet) :
 * un onglet ne s'allonge jamais de plus de 1 / 0,35 (soit 2,86 fois) la distance de décalage, d'où une pointe
 * raccourcie aux angles plus aigus que 41°.
 */
const MIN_MITER_COSINE = 0.35;

/** `p` déplacé de `shiftMm` le long de la normale à gauche de la corde de `before` à `after`. */
function shiftAlongChord(p: PointMm, before: PointMm, after: PointMm, shiftMm: number): PointMm {
  const direction = normalize(subtractPoints(after, before));
  return addPoints(p, scalePoint(leftNormal(direction), shiftMm));
}

/** Signe qui, multiplié par une distance positive, mène vers l'intérieur : la normale à gauche sort quand l'aire est positive. */
function inwardSign(polygon: PolygonMm): 1 | -1 {
  return signedAreaMm2(polygon) > 0 ? -1 : 1;
}

/**
 * Décalage d'une polyligne ouverte de `offsetMm`, à gauche du sens de parcours tel qu'on le voit à l'écran (y vers le
 * bas) ; négatif, à droite. Chaque point glisse le long de la normale à la corde de ses voisins (les extrémités, de
 * leur seul voisin) : le nombre de points ne change pas, et les angles ne reçoivent pas d'onglet.
 */
export function offsetPolyline(points: PolylineMm, offsetMm: number): PointMm[] {
  const lastIndex = points.length - 1;
  return points.map((p, i) =>
    shiftAlongChord(
      p,
      itemAt(points, Math.max(0, i - 1)),
      itemAt(points, Math.min(lastIndex, i + 1)),
      offsetMm,
    ),
  );
}

/**
 * Décalage d'un polygone fermé vers l'intérieur de `insetMm` (négatif : vers l'extérieur), sans onglet : chaque sommet
 * glisse le long de la normale à la corde de ses deux voisins, comme `offsetPolyline`. Convient aux lignes de surpiqûre.
 * Le point `i` du résultat vient du sommet `i`. Un contour de moins de 3 points est rendu tel quel (copie).
 */
export function insetPolygon(polygon: PolygonMm, insetMm: number): PointMm[] {
  if (polygon.length < 3) return [...polygon];
  const shiftMm = inwardSign(polygon) * insetMm;
  return polygon.map((p, i) =>
    shiftAlongChord(p, ringItemAt(polygon, i - 1), ringItemAt(polygon, i + 1), shiftMm),
  );
}

/**
 * Décalage d'un polygone fermé de `insetMm` vers l'intérieur (négatif : vers l'extérieur), avec onglets aux angles :
 * chaque côté se retrouve à `insetMm` de l'original. L'onglet est limité (pointe de 2,86 fois `insetMm` au plus) : aux
 * angles très aigus, le décalage reste en deçà de `insetMm`. Le point `i` du résultat vient du sommet `i`.
 */
export function insetPolygonMiter(polygon: PolygonMm, insetMm: number): PointMm[] {
  const sign = inwardSign(polygon);
  return polygon.map((p, i) => {
    const incoming = leftNormal(normalize(subtractPoints(p, ringItemAt(polygon, i - 1))));
    const outgoing = leftNormal(normalize(subtractPoints(ringItemAt(polygon, i + 1), p)));
    const bisector = normalize(addPoints(incoming, outgoing));
    const stretch = 1 / Math.max(MIN_MITER_COSINE, dotProduct(bisector, incoming));
    return addPoints(p, scalePoint(bisector, sign * insetMm * stretch));
  });
}
