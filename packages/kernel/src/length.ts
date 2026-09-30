/** Longueurs : millimètres partout dans le code ; conversion aux bords seulement. */
export type Millimetres = number;

export const cmToMm = (cm: number): Millimetres => cm * 10;
export const mmToCm = (mm: Millimetres): number => mm / 10;
