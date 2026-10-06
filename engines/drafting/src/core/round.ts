import type { PointMm } from './types.js';

/**
 * Arrondit à 0,001 mm, résolution des sorties du moteur (ADR 0019) : FreeSewing ne rend pas les mêmes derniers
 * chiffres dans Node et dans un navigateur (jusqu'à 1e-11 mm), l'arrondi les efface. Jamais de −0.
 */
export function roundMm(valueMm: number): number {
  const rounded = Math.round(valueMm * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

export function roundPoint(point: PointMm): PointMm {
  return { xMm: roundMm(point.xMm), yMm: roundMm(point.yMm) };
}
