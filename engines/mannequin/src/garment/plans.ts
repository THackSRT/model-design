/*
 * Plans d'habillage par type de vêtement : quelles hauteurs du corps, quel tour fini à chacune
 * (lu sur le patron), quelle section du corps entoure le tissu. Hauteurs en mm depuis le sol.
 *
 * Correspondance patron / corps, par type :
 *  - jupes et pantalon : le haut du patron (taille) est à `waist` ; pantalon : le point d'entrejambe du
 *    patron est à `crotch` (échelle linéaire entre les deux), puis hauteur pour hauteur vers l'ourlet ;
 *  - corsage : y = 0 du patron (taille) est à `waist`, le haut du dos est à `neck`.
 */
import type { GarmentSpec } from '@atelier/contracts-ts';
import { circleProfile, crotchLevel, flatPanels, girthAt, type FlatPanel } from './pattern.js';
import type { SectionPart } from './section.js';
import type { Vec2 } from '../core/types.js';

/** Repères du corps utilisés (sous-ensemble de `LandmarksMm`). */
export interface GarmentLandmarks {
  waist: number;
  crotch: number;
  neck: number;
}

export type Select = (parts: SectionPart[]) => Vec2[];

/** Une suite d'anneaux : hauteurs (mm, décroissantes), tour fini à chacune, section du corps à entourer. */
export interface TubeSpec {
  heightsMm: number[];
  girthMm: (hMm: number) => number;
  select: Select;
  /** Disque de fermeture sous le dernier anneau (entrejambe). */
  closed: boolean;
  /** Au-dessus de l'aisselle (bras soudés au tronc), le tour n'est plus comparable : jamais « trop juste ». */
  relaxAboveArmpit: boolean;
}

const MIN_HEIGHT_MM = 5;

const linspace = (from: number, to: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

/** Enveloppe des composantes principales (tronc, ou les deux jambes), bras exclus. */
export const mainHull: Select = (parts) => {
  const biggest = parts[0]?.area ?? 0;
  return parts.filter((p) => p.area >= 0.4 * biggest).flatMap((p) => p.hull);
};

/** Enveloppe d'une jambe : la plus grande composante de ce côté (x > 0 : gauche), sinon la moitié du tronc. */
const legHull =
  (side: 1 | -1): Select =>
  (parts) => {
    const own = parts.find(
      (p) => Math.sign(p.center[0]) === side && p.area > 0.4 * (parts[0]?.area ?? 0),
    );
    if (own) return own.hull;
    return mainHull(parts).filter((p) => p[0] * side >= 0);
  };

/** Correspondance linéaire par morceaux hauteur du corps -> hauteur du patron, 1:1 hors des repères. */
function pieceMap(anchors: [number, number][]): (hMm: number) => number {
  const sorted = anchors.slice().sort((a, b) => a[0] - b[0]);
  return (h) => {
    const lo = sorted.filter((a) => a[0] <= h).pop();
    const hi = sorted.find((a) => a[0] > h);
    if (lo && hi) return lo[1] + ((h - lo[0]) * (hi[1] - lo[1])) / (hi[0] - lo[0]);
    const near = lo ?? (hi as [number, number]);
    return near[1] + (h - near[0]);
  };
}

const yRange = (panels: FlatPanel[]): { top: number; bottom: number } => ({
  top: Math.max(...panels.map((p) => p.yMax)),
  bottom: Math.min(...panels.map((p) => p.yMin)),
});

/** Jupes : de la taille à l'ourlet ; la jupe cercle se lit en arcs, la jupe droite en largeurs. */
function skirt(
  spec: GarmentSpec,
  lm: GarmentLandmarks,
  count: number,
  circle: boolean,
): TubeSpec[] {
  const panels = flatPanels(spec);
  const { top, bottom } = yRange(panels);
  const toPattern = pieceMap([[lm.waist, top]]);
  const cp = circle ? circleProfile(spec) : undefined;
  const hem = Math.max(MIN_HEIGHT_MM, cp ? lm.waist - cp.lengthMm : lm.waist - (top - bottom));
  const girth = (h: number): number =>
    cp
      ? cp.waistGirthMm + ((cp.hemGirthMm - cp.waistGirthMm) * (lm.waist - h)) / cp.lengthMm
      : girthAt(panels, toPattern(h));
  return [
    {
      heightsMm: linspace(lm.waist, hem, count),
      girthMm: girth,
      select: mainHull,
      closed: false,
      relaxAboveArmpit: false,
    },
  ];
}

/** Pantalon : un tube pour le tronc jusqu'à l'entrejambe, puis un tube par jambe jusqu'à l'ourlet. */
function trousers(spec: GarmentSpec, lm: GarmentLandmarks, count: number): TubeSpec[] {
  const panels = flatPanels(spec);
  const { top, bottom } = yRange(panels);
  const crotchY = crotchLevel(spec);
  const toPattern = pieceMap(
    crotchY === undefined
      ? [[lm.waist, top]]
      : [
          [lm.waist, top],
          [lm.crotch, crotchY],
        ],
  );
  const hem = Math.max(
    MIN_HEIGHT_MM,
    lm.crotch - ((crotchY ?? top - (lm.waist - lm.crotch)) - bottom),
  );
  const step = (lm.waist - hem) / (count - 1);
  const above = linspace(
    lm.waist,
    lm.crotch,
    Math.max(2, Math.round((lm.waist - lm.crotch) / step) + 1),
  );
  const below = linspace(lm.crotch - 1, hem, Math.max(2, Math.round((lm.crotch - hem) / step) + 1));
  const leg = (side: 'left' | 'right', sign: 1 | -1): TubeSpec => ({
    heightsMm: below,
    girthMm: (h) => girthAt(panels, toPattern(h), side),
    select: legHull(sign),
    closed: false,
    relaxAboveArmpit: false,
  });
  const torso: TubeSpec = {
    heightsMm: above,
    girthMm: (h) => girthAt(panels, toPattern(h)),
    select: mainHull,
    closed: true,
    relaxAboveArmpit: false,
  };
  return [torso, leg('left', 1), leg('right', -1)];
}

/**
 * Tour fini d'un corsage : le plus grand tour sur une fenêtre de ±30 mm. Une pince de poitrine
 * latérale échancre le contour à plat sur toute sa hauteur ; une fois cousue, elle raccourcit le
 * vêtement mais ne réduit pas le tour : le tour à plat à cette hauteur sous-estime le tour fini.
 */
function windowedGirth(panels: FlatPanel[], y: number): number {
  return Math.max(...[-30, -15, 0, 15, 30].map((d) => girthAt(panels, y + d)));
}

/** Corsage (sans les manches) : de sous la taille au cou. */
function bodice(spec: GarmentSpec, lm: GarmentLandmarks, count: number): TubeSpec[] {
  const panels = flatPanels(spec);
  const { bottom } = yRange(panels);
  const top = Math.min(...panels.map((p) => p.yMax));
  const toPattern = pieceMap([
    [lm.neck, top],
    [lm.waist, 0],
  ]);
  const hem = Math.max(MIN_HEIGHT_MM, lm.waist + Math.min(0, bottom));
  return [
    {
      heightsMm: linspace(lm.neck, hem, count),
      girthMm: (h) => windowedGirth(panels, toPattern(h)),
      select: mainHull,
      closed: false,
      relaxAboveArmpit: true,
    },
  ];
}

export function planFor(
  type: string,
  spec: GarmentSpec,
  lm: GarmentLandmarks,
  count: number,
): TubeSpec[] {
  switch (type) {
    case 'straight-skirt':
      return skirt(spec, lm, count, false);
    case 'circle-skirt':
      return skirt(spec, lm, count, true);
    case 'trousers':
      return trousers(spec, lm, count);
    case 'bodice':
      return bodice(spec, lm, count);
    default:
      throw new Error(`Type de vêtement non pris en charge par l'habillage : ${type}`);
  }
}
