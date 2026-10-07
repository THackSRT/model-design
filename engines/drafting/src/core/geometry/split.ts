import { itemAt } from './access.js';
import { GeometryError } from './errors.js';
import { polygonCrossings } from './intersect.js';
import { dedupePoints } from './point-set.js';
import type { Crossing, PointMm, PolygonMm, PolygonSplit, PolylineMm } from './types.js';

/** Le contour du polygone, de `from` à `to` dans le sens des points : le croisement, les sommets franchis, le croisement. */
function walkBoundary(polygon: PolygonMm, from: Crossing, to: Crossing): PointMm[] {
  if (from.edgeIndex === to.edgeIndex && to.edgePosition > from.edgePosition) {
    return [from.point, to.point];
  }
  const walked = [from.point];
  const count = polygon.length;
  let index = (from.edgeIndex + 1) % count;
  for (let guard = 0; guard <= count; guard++) {
    walked.push(itemAt(polygon, index));
    if (index === to.edgeIndex) break;
    index = (index + 1) % count;
  }
  walked.push(to.point);
  return walked;
}

/** Ligne de couture : du premier croisement au dernier, par les points de la découpe qui se trouvent entre eux. */
function seamBetween(cut: PolylineMm, first: Crossing, last: Crossing): PointMm[] {
  const seam = [first.point];
  for (let i = Math.floor(first.cutPosition) + 1; i <= Math.floor(last.cutPosition); i++) {
    seam.push(itemAt(cut, i));
  }
  seam.push(last.point);
  return seam;
}

/**
 * Découpe un polygone par une polyligne qui traverse son contour : la découpe est prise du premier au dernier
 * croisement, et partage le polygone en deux morceaux, `a` et `b`, qui gardent le sens de parcours du polygone. Rend
 * aussi la ligne de couture (la portion de découpe entre les deux croisements). Les points confondus sont retirés
 * (`dedupePoints`). Moins de deux croisements : `GeometryError` de code `no-crossing`. La somme des aires signées des
 * deux morceaux est celle du polygone ; avec plus de deux croisements (polygone creux), la portion de découpe entre le
 * premier et le dernier peut sortir du polygone, et les morceaux ne sont alors plus forcément simples.
 */
export function splitPolygon(polygon: PolygonMm, cut: PolylineMm): PolygonSplit {
  const crossings = polygonCrossings(polygon, cut);
  const first = crossings[0];
  const last = crossings[crossings.length - 1];
  if (first === undefined || last === undefined || crossings.length < 2) {
    throw new GeometryError('no-crossing', 'the cut must cross the polygon outline at least twice');
  }
  const seam = seamBetween(cut, first, last);
  const inside = seam.slice(1, -1);
  return {
    a: dedupePoints([...walkBoundary(polygon, first, last), ...[...inside].reverse()], true),
    b: dedupePoints([...walkBoundary(polygon, last, first), ...inside], true),
    seam: dedupePoints(seam),
  };
}
