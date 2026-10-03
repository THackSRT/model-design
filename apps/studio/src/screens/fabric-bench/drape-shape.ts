import { CUSICK_DISC_DIAMETER_MM, CUSICK_SPECIMEN_DIAMETER_MM } from '@atelier/drape';

export const DISC_RADIUS_MM = CUSICK_DISC_DIAMETER_MM / 2;
export const SPECIMEN_RADIUS_MM = CUSICK_SPECIMEN_DIAMETER_MM / 2;
/** Marge autour de l'éprouvette à plat : l'ombre ne la dépasse jamais. */
const VIEW_MARGIN_MM = 10;
const VIEW_HALF_MM = SPECIMEN_RADIUS_MM + VIEW_MARGIN_MM;
const POINT_DECIMALS = 1;

/** Cadre de la vue de dessus, centré sur l'axe de l'éprouvette, en mm. */
export const VIEW_BOX = `${-VIEW_HALF_MM} ${-VIEW_HALF_MM} ${2 * VIEW_HALF_MM} ${2 * VIEW_HALF_MM}`;

/** Points d'un polygone SVG depuis un contour (x, z par secteur, en mm) ; vide si le contour est absent ou incomplet. */
export function outlinePoints(outlineMm: Float64Array): string {
  const count = Math.floor(outlineMm.length / 2);
  if (count < 3) return '';
  const points: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = outlineMm[2 * i] as number;
    const z = outlineMm[2 * i + 1] as number;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return '';
    points.push(`${x.toFixed(POINT_DECIMALS)},${z.toFixed(POINT_DECIMALS)}`);
  }
  return points.join(' ');
}
