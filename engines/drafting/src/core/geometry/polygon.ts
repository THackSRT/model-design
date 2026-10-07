import { itemAt, ringItemAt } from './access.js';
import type { PointMm, PolygonMm } from './types.js';

/**
 * Aire signée d'un polygone, en mm² (formule du lacet). Positive quand le contour tourne dans le sens horaire à
 * l'écran (y vers le bas), négative dans le sens inverse, nulle pour un contour plat ou de moins de 3 points.
 */
export function signedAreaMm2(polygon: PolygonMm): number {
  let twiceMm2 = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = itemAt(polygon, i);
    const b = ringItemAt(polygon, i + 1);
    twiceMm2 += a.xMm * b.yMm - b.xMm * a.yMm;
  }
  return twiceMm2 / 2;
}

/**
 * Le point est-il dans le polygone ? Règle pair-impair (un rayon horizontal vers la droite croise le contour un nombre
 * impair de fois). Un point sur le contour peut tomber de l'un ou l'autre côté.
 */
export function isPointInPolygon(p: PointMm, polygon: PolygonMm): boolean {
  let inside = false;
  for (let i = 0; i < polygon.length; i++) {
    const a = itemAt(polygon, i);
    const b = ringItemAt(polygon, i - 1);
    const straddles = a.yMm > p.yMm !== b.yMm > p.yMm;
    if (straddles && p.xMm < ((b.xMm - a.xMm) * (p.yMm - a.yMm)) / (b.yMm - a.yMm) + a.xMm) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Abscisse x du contour d'un polygone à la hauteur `yMm` : la plus grande (`side` `'max'`, côté droit, par défaut) ou
 * la plus petite (`'min'`). Les arêtes horizontales sont ignorées. `undefined` si le contour ne passe pas à cette hauteur.
 */
export function boundaryXMm(
  polygon: PolygonMm,
  yMm: number,
  side: 'min' | 'max' = 'max',
): number | undefined {
  const xs: number[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = itemAt(polygon, i);
    const b = ringItemAt(polygon, i + 1);
    const crosses = (a.yMm - yMm) * (b.yMm - yMm) <= 0 && a.yMm !== b.yMm;
    if (crosses) xs.push(a.xMm + ((yMm - a.yMm) / (b.yMm - a.yMm)) * (b.xMm - a.xMm));
  }
  if (xs.length === 0) return undefined;
  return xs.reduce((best, x) => (side === 'max' ? Math.max(best, x) : Math.min(best, x)));
}
