/*
 * Aisselle : creux entre le bras et le tronc. Sous le creux, une coupe horizontale rencontre le bras et le tronc
 * comme deux contours séparés ; au niveau du creux ils se rejoignent. On descend depuis le haut de l'épaule jusqu'au
 * premier niveau où le bras (côté lu) est séparé du tronc, puis on affine par dichotomie : c'est le haut du
 * creux, que le mètre ruban (ou la règle posée sous le bras) atteint. Unités : cm.
 */
import { bandTriangles, type Chain, largestLoop, planarArea, sliceMesh } from './slice.js';
import type { Vec3 } from './types.js';

/** Pas de la descente (cm). */
const STEP_CM = 1.5;
/** Nombre de dichotomies : 1,5 cm / 2^8 = 0,06 mm. */
const REFINE = 8;
/** Au-dessus du pivot de l'épaule (cm), le tronc et le bras sont fondus : départ de la descente. */
const ABOVE_CM = 4;
/** Sous le pivot de l'épaule (cm), au-delà de cette profondeur le creux est introuvable (6 à 11 cm observés). */
const BELOW_CM = 15;
/** Aire minimale d'une coupe de bras (cm²) : écarte les doigts et les plis isolés. */
const MIN_ARM_AREA_CM2 = 3;

/** Coupe d'un niveau : contour du tronc et contour du bras du côté lu, si le bras est séparé. */
interface Level {
  torso: Chain;
  arm: Chain | undefined;
}

const meanX = (c: Chain): number => c.points.reduce((s, p) => s + p[0], 0) / c.points.length;

/** Contours du niveau `y` : le plus grand est le tronc ; le bras est le plus grand autre contour du côté lu. */
function levelAt(pos: Float32Array, tris: number[], y: number, side: 1 | -1): Level | undefined {
  const chains = sliceMesh(pos, tris, 1, y);
  const torso = largestLoop(chains, 0, 2);
  if (!torso) return undefined;
  let arm: Chain | undefined;
  let armArea = MIN_ARM_AREA_CM2;
  for (const c of chains) {
    if (c === torso || !c.closed || side * meanX(c) <= 0) continue;
    const area = planarArea(c.points, 0, 2);
    if (area > armArea) {
      arm = c;
      armArea = area;
    }
  }
  return { torso, arm };
}

/** Écart toléré au-delà du plus petit écart pour qu'un point du tronc compte dans le creux (cm). */
const APEX_SPREAD_CM = 0.3;

const gap = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Point du bras le plus proche de `p`, et son écart. */
function nearest(p: Vec3, arm: Chain): { near: Vec3; gap: number } {
  let best = { near: p, gap: Infinity };
  for (const q of arm.points) {
    const d = gap(p, q);
    if (d < best.gap) best = { near: q, gap: d };
  }
  return best;
}

/**
 * Centre du creux : milieu des paires (point du tronc, point du bras le plus proche) dont l'écart est au plus
 * celui de la paire la plus proche plus `APEX_SPREAD_CM`. Le haut du creux est une ligne presque horizontale : son
 * milieu est plus stable que la seule paire la plus proche. Chaque point pèse la longueur de contour qu'il
 * représente, pour que la densité du maillage ne déplace pas le centre.
 */
function apexCenter(torso: Chain, arm: Chain): Vec3 {
  const pts = torso.points;
  const pairs = pts.map((p, i) => {
    const before = pts[(i + pts.length - 1) % pts.length] as Vec3;
    const after = pts[(i + 1) % pts.length] as Vec3;
    return { p, weight: (gap(p, before) + gap(p, after)) / 2, ...nearest(p, arm) };
  });
  const limit = Math.min(...pairs.map((e) => e.gap)) + APEX_SPREAD_CM;
  const kept = pairs.filter((e) => e.gap <= limit);
  const total = kept.reduce((s, e) => s + e.weight, 0);
  const mean = (q: 0 | 1 | 2): number =>
    kept.reduce((s, e) => s + ((e.p[q] + e.near[q]) / 2) * e.weight, 0) / total;
  return [mean(0), mean(1), mean(2)];
}

/**
 * Creux de l'aisselle du côté `side` (1 : gauche du mannequin, x > 0 ; -1 : droit), à partir du pivot de l'épaule.
 * Rend le centre du creux, au niveau où le bras et le tronc se rejoignent.
 */
export function armpitPoint(
  pos: Float32Array,
  tris: ArrayLike<number>,
  side: 1 | -1,
  pivot: Vec3,
): Vec3 {
  const rows = bandTriangles(pos, tris, pivot[1] - BELOW_CM, pivot[1] + ABOVE_CM);
  let y = pivot[1] + ABOVE_CM;
  let apart = levelAt(pos, rows, y, side);
  while (y > pivot[1] - BELOW_CM && !apart?.arm) {
    y -= STEP_CM;
    apart = levelAt(pos, rows, y, side);
  }
  if (!apart?.arm) throw new Error("Repère d'aisselle introuvable : bras jamais séparé du tronc");
  let apartY = y;
  let joinedY = y + STEP_CM;
  for (let k = 0; k < REFINE; k++) {
    const mid = (apartY + joinedY) / 2;
    const level = levelAt(pos, rows, mid, side);
    if (level?.arm) {
      apartY = mid;
      apart = level;
    } else joinedY = mid;
  }
  return apexCenter(apart.torso, apart.arm as Chain);
}
