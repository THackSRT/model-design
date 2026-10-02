/** Hauteurs (mm depuis le sol) d'une zone où le vêtement est trop juste. */
export interface TightBand {
  fromMm: number;
  toMm: number;
}

/** Les anneaux du vêtement sont aux hauteurs des zones, arrondies au mm : un mm de marge. */
const MARGIN_MM = 1;

/**
 * Pour chaque sommet (positions en cm, y vertical, sol à y = 0), vrai s'il est dans une zone trop
 * juste. Pur : la teinte d'alerte est choisie par `scene.ts` depuis les jetons.
 */
export function tightVertices(positions: Float32Array, zones: readonly TightBand[]): boolean[] {
  const count = Math.floor(positions.length / 3);
  return Array.from({ length: count }, (_, i) => {
    const heightMm = (positions[3 * i + 1] ?? 0) * 10;
    return zones.some((z) => heightMm >= z.fromMm - MARGIN_MM && heightMm <= z.toMm + MARGIN_MM);
  });
}
