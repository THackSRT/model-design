/*
 * Épaule : point d'encolure à l'épaule (côté du cou) et acromion, lus sur le contour supérieur de l'épaule vu
 * de face. Le contour est le plus haut point de chaque coupe verticale x = constante, tête exclue. Du cou vers
 * le bras il redescend d'abord brusquement (le cou se raccorde à l'épaule), puis presque à plat (haut de
 * l'épaule), puis plonge dans le bras : les deux repères sont les points où la pente franchit un seuil.
 * Unités : cm. Le maillage ne porte aucun os : repères géométriques, pas osseux.
 */
import { bandTriangles, type Chain, sliceMesh } from './slice.js';
import type { Vec3 } from './types.js';

/** Pas entre deux coupes verticales (cm). */
const STEP_CM = 0.2;
/** Fenêtre de lecture de la pente, en pas (6 mm) : lisse les facettes du maillage. */
const WINDOW = 3;
/** Pente (cm perdus par cm vers l'extérieur) à partir de laquelle le contour rejoint le cou : 45°. */
const NECK_SLOPE = 1;
/** Pente à partir de laquelle le contour plonge dans le bras : 35°. */
const ACROMION_SLOPE = Math.tan((35 * Math.PI) / 180);
/** Au-dessus de l'anneau de cou de cette marge (cm), les sommets sont ceux de la tête et sont écartés. */
const HEAD_MARGIN_CM = 2.5;
/** Largeur lue au-delà du pivot de l'épaule (cm). */
const REACH_CM = 8;
/** Hauteur lue sous le pivot (cm) : le haut de l'épaule est au-dessus, la marge couvre les épaules tombantes. */
const DEPTH_CM = 3;

export interface ShoulderInput {
  pos: Float32Array;
  tris: ArrayLike<number>;
  /** Pivot de l'épaule du côté lu (cm). */
  pivot: Vec3;
  /** Anneau de cou : demi-largeur et hauteur (cm). */
  neck: { halfWidth: number; y: number };
}

export interface ShoulderPoints {
  /** Point d'encolure à l'épaule (côté du cou). */
  neckShoulder: Vec3;
  acromion: Vec3;
}

/** Point le plus haut des coupes, sous la hauteur `cap` (la tête est au-dessus). */
function highestBelow(chains: Chain[], cap: number): Vec3 | undefined {
  let top: Vec3 | undefined;
  for (const p of chains.flatMap((chain) => chain.points)) {
    if (p[1] <= cap && (!top || p[1] > top[1])) top = p;
  }
  return top;
}

const TOO_SHORT = "Repère d'épaule introuvable : contour supérieur trop court";

/**
 * Contour supérieur du côté `side` (1 : gauche du mannequin, x > 0 ; -1 : droit), lu à la demande : le point
 * d'indice k est le plus haut de la coupe verticale à `neck.halfWidth + k` pas du plan sagittal ; une coupe n'est
 * faite qu'une fois.
 */
function topContour(input: ShoulderInput, side: 1 | -1): (k: number) => Vec3 {
  const cap = input.neck.y + HEAD_MARGIN_CM;
  const band = bandTriangles(input.pos, input.tris, input.pivot[1] - DEPTH_CM, cap);
  const known = new Map<number, Vec3>();
  return (k) => {
    let top = known.get(k);
    if (!top) {
      const x = input.neck.halfWidth + k * STEP_CM;
      top = highestBelow(sliceMesh(input.pos, band, 0, side * x), cap);
      if (!top) throw new Error(TOO_SHORT);
      known.set(k, top);
    }
    return top;
  };
}

/**
 * Repères de l'épaule du côté `side`. Du côté du cou vers l'extérieur, le point d'encolure est le premier point où
 * le contour ne monte plus de 45° vers le cou ; du pivot vers le bras, l'acromion est le premier point où le
 * contour descend de plus de 35°.
 */
export function shoulderPoints(input: ShoulderInput, side: 1 | -1): ShoulderPoints {
  const reach = Math.abs(input.pivot[0]) + REACH_CM - input.neck.halfWidth;
  const usable = Math.floor(reach / STEP_CM) - WINDOW;
  if (usable < 2) throw new Error(TOO_SHORT);
  const at = topContour(input, side);
  /** Hauteur perdue par cm de largeur entre le point k et le point k + WINDOW. */
  const slope = (k: number): number => {
    const [a, b] = [at(k), at(k + WINDOW)];
    return (a[1] - b[1]) / Math.abs(b[0] - a[0]);
  };
  const pivotK = Math.round((Math.abs(input.pivot[0]) - input.neck.halfWidth) / STEP_CM);
  const start = Math.min(Math.max(pivotK, 0), usable - 1);
  let neck = 0;
  while (neck < start && slope(neck) >= NECK_SLOPE) neck++;
  let acromion = start;
  while (acromion < usable && slope(acromion) < ACROMION_SLOPE) acromion++;
  return { neckShoulder: at(neck), acromion: at(acromion) };
}
