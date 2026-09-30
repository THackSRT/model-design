import type { Projected } from './projection.js';

/** Masque binaire : `data[row * width + col]` vaut 1 sous la forme ; la rangée 0 est en haut. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface MaskGrid {
  mask: Mask;
  /** Pixels de marge autour de la forme (le contour ne touche jamais le bord). */
  padding: number;
}

const PADDING = 2;

/** Plage de pixels [première, dernière] couverte par l'intervalle [lo, hi] (en pixels), bornée à `max`. */
function span(lo: number, hi: number, max: number): [number, number] {
  return [Math.max(0, Math.floor(lo - 0.5)), Math.min(max - 1, Math.ceil(hi - 0.5))];
}

/** Remplit dans le masque les pixels dont le centre est dans le triangle (a, b, c), en pixels. */
function fillTriangle(mask: Mask, t: readonly number[]): void {
  const at = (i: number) => t[i] ?? 0;
  const [ax, ay, bx, by, cx, cy] = [at(0), at(1), at(2), at(3), at(4), at(5)];
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  const [col0, col1] = span(Math.min(ax, bx, cx), Math.max(ax, bx, cx), mask.width);
  const [row0, row1] = span(Math.min(ay, by, cy), Math.max(ay, by, cy), mask.height);
  const eps = 1e-9 * Math.abs(area);
  const sign = area > 0 ? 1 : -1;
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const px = col + 0.5;
      const py = row + 0.5;
      const w0 = sign * ((bx - ax) * (py - ay) - (by - ay) * (px - ax));
      const w1 = sign * ((cx - bx) * (py - by) - (cy - by) * (px - bx));
      const w2 = sign * ((ax - cx) * (py - cy) - (ay - cy) * (px - cx));
      if (Math.min(w0, w1, w2) >= -eps) mask.data[row * mask.width + col] = 1;
    }
  }
}

/** Rastérise en logiciel les triangles projetés ; `pxPerCm` fixe la résolution du masque. */
export function rasterize(
  projected: Projected,
  index: ArrayLike<number>,
  pxPerCm: number,
): MaskGrid {
  const width = Math.ceil((projected.maxX - projected.minX) * pxPerCm) + 2 * PADDING;
  const height = Math.ceil((projected.maxY - projected.minY) * pxPerCm) + 2 * PADDING;
  const mask: Mask = { width, height, data: new Uint8Array(width * height) };
  const p = projected.points;
  const toCol = (x: number) => (x - projected.minX) * pxPerCm + PADDING;
  const toRow = (y: number) => (projected.maxY - y) * pxPerCm + PADDING;
  const t: number[] = new Array<number>(6).fill(0);
  for (let i = 0; i + 2 < index.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = index[i + k] ?? 0;
      t[2 * k] = toCol(p[2 * v] ?? 0);
      t[2 * k + 1] = toRow(p[2 * v + 1] ?? 0);
    }
    fillTriangle(mask, t);
  }
  return { mask, padding: PADDING };
}
