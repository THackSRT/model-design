import { centroid, convexHull, extremeArc, midlineArc, offsetCurve, type Curve } from './hull.js';
import type { Frame } from './frames.js';
import { sectionPoints } from './select.js';
import type { BodySectioner } from './section.js';
import { PlacementError, type AvatarShape, type P2 } from './types.js';

// Piles de niveaux autour d'un niveau d'ancrage. Tronc : à chaque niveau, l'enveloppe convexe de tout ce que le corps
// occupe entre l'ancrage et ce niveau (elle ne rétrécit jamais en s'éloignant de l'ancrage : une jupe ancrée à la
// taille enveloppe les hanches, une pièce n'entre jamais dans un renflement du corps). Jambe et bras : la section du
// niveau. Dans les deux cas décalée de `clearanceMm`.

/** Écart entre deux niveaux, mm. */
export const LEVEL_STEP_MM = 5;
/** Nombre de niveaux de part et d'autre de l'ancrage au-delà duquel l'enveloppe ne change plus (±6 m). */
const MAX_LEVELS = 1200;

export type Facing = 'front' | 'back' | 'outer';

export interface LevelCurve {
  curve: Curve;
  centre: P2;
  /** Abscisse du milieu de la face regardée. */
  startArc: number;
}

export interface LevelStack {
  /** Courbe du niveau k (k > 0 : au-dessus de l'ancrage ; k < 0 : en dessous). */
  curveAt(k: number): LevelCurve;
}

export interface StackSpec {
  frame: Frame;
  avatar: AvatarShape;
  sectioner: BodySectioner;
  facing: Facing;
  clearanceMm: number;
}

function failed(message: string): PlacementError {
  return new PlacementError('placement-failed', undefined, message);
}

/** Abscisse du milieu de la face regardée sur la courbe décalée. */
function startArc(curve: Curve, frame: Frame, facing: Facing): number {
  const torso = frame.zone === 'torso';
  let arc: number;
  if (frame.zone === 'arm' && facing === 'outer') {
    arc = extremeArc(curve, [frame.side === 'left' ? 1 : -1, 0]);
  } else if (facing === 'back') {
    arc = torso ? midlineArc(curve, false) : extremeArc(curve, [0, -1]);
  } else {
    arc = torso ? midlineArc(curve, true) : extremeArc(curve, [0, 1]);
  }
  if (arc < 0) throw failed('the body section does not cross the midline');
  return arc;
}

export function createLevelStack(spec: StackSpec): LevelStack {
  const { frame, avatar, sectioner } = spec;
  // Tronc : enveloppe cumulée depuis l'ancrage ; jambes et bras : la section du niveau seule (un tube suit le membre).
  const accumulate = frame.zone === 'torso';
  const hulls = { up: [] as P2[][], down: [] as P2[][] };
  const curves = new Map<number, LevelCurve>();
  const levelPoints = (k: number): P2[] => {
    const l = k * LEVEL_STEP_MM;
    const cr = sectioner.cut(frame.origin(l), frame.up);
    return sectionPoints(frame, l, cr, avatar);
  };
  const hullAt = (k: number): P2[] => {
    const list = k >= 0 ? hulls.up : hulls.down;
    const n = Math.abs(k);
    for (let i = list.length; i <= n; i++) {
      const pts = levelPoints(k >= 0 ? i : -i);
      const prev = i === 0 ? [] : (list[i - 1] as P2[]);
      if (pts.length === 0 && i === 0)
        throw failed('the body section at the anchor height is empty');
      const local = convexHull(pts);
      list.push(pts.length === 0 ? prev : accumulate ? convexHull([...prev, ...local]) : local);
    }
    return list[n] as P2[];
  };
  return {
    curveAt(level) {
      const k = Math.max(-MAX_LEVELS, Math.min(MAX_LEVELS, level));
      const known = curves.get(k);
      if (known) return known;
      const hull = hullAt(k);
      if (hull.length < 3) throw failed('the body section is degenerate');
      const curve = offsetCurve(hull, spec.clearanceMm);
      const made = { curve, centre: centroid(hull), startArc: startArc(curve, frame, spec.facing) };
      curves.set(k, made);
      return made;
    },
  };
}
