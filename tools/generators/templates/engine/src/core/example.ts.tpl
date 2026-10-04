/** Point du plan, en millimètres. */
export interface PointMm {
  xMm: number;
  yMm: number;
}

/**
 * Exemple de fonction pure du cœur, à remplacer par le premier vrai module : distance entre deux points, en mm.
 * Seulement `+ − × ÷` et `Math.sqrt`, pour un résultat identique au bit près dans le navigateur, un Worker et Node.
 */
export function distanceMm(a: PointMm, b: PointMm): number {
  const dx = b.xMm - a.xMm;
  const dy = b.yMm - a.yMm;
  return Math.sqrt(dx * dx + dy * dy);
}
