import type { Frame } from './frames.js';
import { convexHull, offsetCurve, pointAt, type Curve } from './hull.js';
import type { BodySectioner } from './section.js';
import { sectionPoints } from './select.js';
import type { AvatarShape, P2 } from './types.js';

// Repli sur l'épaule (ADR 0013, « Corsage et manches : repli sur l'épaule »). Au-dessus de `shoulder` − 40 mm, la
// partie d'une pièce du tronc n'est plus montée droite : elle est couchée le long du profil sagittal du corps (coupe
// par le plan x = x du sommet, sans les bras, enveloppe convexe décalée de `clearanceMm`), depuis la face regardée, de
// l'excédent de hauteur. Les épaules partent ainsi au-dessus de l'épaule et se ferment sans traverser le corps.

/** Le repli commence à cette distance sous la hauteur de l'épaule, mm. */
export const FOLD_BELOW_SHOULDER_MM = 40;
/**
 * Le trajet sagittal par-dessus l'épaule est plus long que le patron (mesuré : les coutures d'épaule partent à 88 mm
 * sans ce facteur, 71 mm avec) : l'excédent de hauteur est porté sur le profil multiplié par ce facteur.
 */
const FOLD_STRETCH = 1.05;
/** Pas des plans de coupe en x, mm (les profils sont mémorisés). */
const X_STEP_MM = 5;
/** Le profil ne garde que les points de cette hauteur sous le début du repli et au-dessus, jusqu'au cou, mm. */
const WINDOW_BELOW_MM = 100;
/** Recul en x quand le plan ne coupe que des bras (au bout de l'épaule), mm. */
const RETREAT_MM = 10;

export type FoldFacing = 'front' | 'back';

/** Position repliée : hauteur sur le corps et déplacement vers l'avant (z) par rapport à la position à la hauteur de départ. */
export interface Folded {
  y: number;
  dz: number;
}

export interface ShoulderFold {
  /** Hauteur de départ du repli, mm depuis le sol. */
  startMm: number;
  /** Position du point à `excessMm` au-delà du départ, sur le profil du plan x ; `undefined` sans profil. */
  fold(facing: FoldFacing, x: number, clearanceMm: number, excessMm: number): Folded | undefined;
}

interface Profile {
  curve: Curve;
  /** Abscisse du point de la face (devant : z maximal ; dos : z minimal) à la hauteur de départ. */
  frontArc: number;
  backArc: number;
}

const planeFrame = (x: number): Frame => ({
  zone: 'torso',
  side: 'center',
  up: [1, 0, 0],
  e1: [0, 0, 1],
  e2: [0, 1, 0],
  origin: () => [x, 0, 0],
});

/** Abscisse du croisement de la courbe avec la hauteur `level`, côté z maximal (`front`) ou minimal ; -1 sans croisement. */
function crossingArc(curve: Curve, level: number, front: boolean): number {
  const { points, cumulative } = curve;
  let bestA = front ? -Infinity : Infinity;
  let arc = -1;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length] as P2;
    if ((p[1] - level) * (q[1] - level) > 0 || p[1] === q[1]) return;
    const w = (level - p[1]) / (q[1] - p[1]);
    const a = p[0] + (q[0] - p[0]) * w;
    if (front ? a > bestA : a < bestA) {
      bestA = a;
      arc =
        (cumulative[i] as number) + w * ((cumulative[i + 1] as number) - (cumulative[i] as number));
    }
  });
  return arc;
}

/** Profils mémorisés par plan x (pas de 5 mm) et décalage ; `null` si le plan ne donne pas de profil. */
function profileSource(
  avatar: AvatarShape,
  sectioner: BodySectioner,
  startMm: number,
): (x: number, clearanceMm: number) => Profile | null {
  const top = avatar.landmarksMm.neck;
  const profiles = new Map<string, Profile | null>();
  const build = (xq: number, clearanceMm: number): Profile | null => {
    const cr = sectioner.cut([xq, 0, 0], [1, 0, 0]);
    const pts = sectionPoints(planeFrame(xq), 0, cr, avatar).filter(
      (p) => p[1] >= startMm - WINDOW_BELOW_MM && p[1] <= top,
    );
    const hull = pts.length < 3 ? [] : convexHull(pts);
    if (hull.length < 3) return null;
    const curve = offsetCurve(hull, clearanceMm);
    const frontArc = crossingArc(curve, startMm, true);
    const backArc = crossingArc(curve, startMm, false);
    return frontArc < 0 || backArc < 0 ? null : { curve, frontArc, backArc };
  };
  return (x, clearanceMm) => {
    let xq = X_STEP_MM * Math.floor(x / X_STEP_MM + 0.5);
    for (let tries = 0; tries < 100; tries++) {
      const key = `${xq}|${clearanceMm}`;
      let known = profiles.get(key);
      if (known === undefined) {
        known = build(xq, clearanceMm);
        profiles.set(key, known);
      }
      if (known) return known;
      if (xq === 0) return null;
      xq = xq > 0 ? Math.max(0, xq - RETREAT_MM) : Math.min(0, xq + RETREAT_MM);
    }
    return null;
  };
}

export function createShoulderFold(avatar: AvatarShape, sectioner: BodySectioner): ShoulderFold {
  const startMm = avatar.landmarksMm.shoulder - FOLD_BELOW_SHOULDER_MM;
  const profileAt = profileSource(avatar, sectioner, startMm);
  return {
    startMm,
    fold(facing, x, clearanceMm, excessMm) {
      const profile = profileAt(x, clearanceMm);
      if (!profile) return undefined;
      const front = facing === 'front';
      const arc = FOLD_STRETCH * excessMm;
      // Courbe horaire (z à droite, y en haut) : monter depuis la face avant est le sens antihoraire, depuis le dos l'horaire.
      const from = front ? profile.frontArc : profile.backArc;
      const p0 = pointAt(profile.curve, from);
      const p = pointAt(profile.curve, front ? from - arc : from + arc);
      return { y: p[1], dz: p[0] - p0[0] };
    },
  };
}
