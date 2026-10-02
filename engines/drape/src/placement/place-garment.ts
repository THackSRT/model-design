import type { GarmentSpec } from '@atelier/contracts-ts';
import type { GarmentMesh } from '../mesh/garment-mesh.js';
import { makeFrame, type Frame } from './frames.js';
import { pointAt } from './hull.js';
import { instancesOf, type Instance } from './instances.js';
import { LEVEL_STEP_MM, createLevelStack, type LevelStack } from './levels.js';
import { createSectioner, type BodySectioner } from './section.js';
import { PlacementError, type AvatarShape } from './types.js';
import { circumferences, type CircumferenceAt } from './widths.js';

export { assertPlacements } from './instances.js';

// Mise en place (ADR 0013) : chaque exemplaire de pièce est enroulé autour de la section du corps à la hauteur de son
// repère, décalée de `clearanceMm`. Le point d'ancrage de la pièce va sur la ligne médiane de la face regardée, à la
// hauteur du repère plus le décalage ; l'abscisse de la pièce devient l'abscisse curviligne sur la courbe (vue de
// dehors, la droite de la pièce est dans le sens horaire de la coupe vue d'en haut, de face comme de dos). La hauteur
// de la pièce devient la hauteur sur le corps.

/** Marge sur le tour fini : les exemplaires d'un tour évasé se touchent presque, sans chevaucher, au départ. */
const FLARE_MARGIN = 1.02;

interface Context {
  mesh: GarmentMesh;
  avatar: AvatarShape;
  sectioner: BodySectioner;
  stacks: Map<string, { frame: Frame; stack: LevelStack }>;
  circumference: CircumferenceAt;
  out: Float64Array;
}

function stackOf(ctx: Context, inst: Instance): { frame: Frame; stack: LevelStack } {
  const frameSide = inst.zone === 'torso' ? 'center' : inst.side;
  const key = [inst.zone, frameSide, inst.facing, inst.heightMm, inst.clearanceMm].join('|');
  const known = ctx.stacks.get(key);
  if (known) return known;
  const frame = makeFrame(inst.zone, frameSide, ctx.avatar, inst.heightMm);
  const stack = createLevelStack({
    frame,
    avatar: ctx.avatar,
    sectioner: ctx.sectioner,
    facing: inst.facing,
    clearanceMm: inst.clearanceMm,
  });
  ctx.stacks.set(key, { frame, stack });
  return { frame, stack };
}

/** Niveau (indice de pas) du plan de la hauteur de pièce `d` au-dessus de l'ancre, arrondi à l'écart de l'ancre. */
function levelIndex(d: number): number {
  const k = Math.ceil(Math.abs(d) / LEVEL_STEP_MM);
  return d >= 0 ? k : -k;
}

function placeInstance(ctx: Context, inst: Instance): void {
  const { frame, stack } = stackOf(ctx, inst);
  const { vertexStart, vertexCount, shiftXMm } = inst.piece;
  for (let v = vertexStart; v < vertexStart + vertexCount; v++) {
    const y = ctx.mesh.cloth.flatMm[2 * v + 1] as number;
    const d = y - inst.anchorV;
    const level = stack.curveAt(levelIndex(d));
    const total = ctx.circumference(inst, y);
    const lambda = Math.max(1, (total * FLARE_MARGIN) / level.curve.length);
    const s = (ctx.mesh.cloth.flatMm[2 * v] as number) - shiftXMm - inst.anchorU;
    const q = pointAt(level.curve, level.startArc + s / lambda);
    const a = level.centre[0] + lambda * (q[0] - level.centre[0]);
    const b = level.centre[1] + lambda * (q[1] - level.centre[1]);
    const o = frame.origin(d);
    for (let k = 0; k < 3; k++) {
      ctx.out[3 * v + k] =
        (o[k] as number) + a * (frame.e1[k] as number) + b * (frame.e2[k] as number);
    }
  }
}

/**
 * Positions de départ (mm, 3 par sommet) du vêtement autour de l'avatar. Lance `PlacementError`
 * (`placement-failed`) si une pièce ne peut pas être enroulée ; `assertPlacements` doit avoir été appelée avant le
 * maillage.
 */
export function placeGarment(
  mesh: GarmentMesh,
  spec: GarmentSpec,
  avatar: AvatarShape,
): Float64Array {
  const instances = instancesOf(mesh, spec, avatar);
  const ctx: Context = {
    mesh,
    avatar,
    sectioner: createSectioner(avatar.body),
    stacks: new Map(),
    circumference: circumferences(mesh, instances),
    out: new Float64Array(mesh.cloth.positionsMm.length),
  };
  for (const inst of instances) {
    try {
      placeInstance(ctx, inst);
    } catch (error) {
      if (error instanceof PlacementError && error.panelId === undefined) {
        throw new PlacementError(
          error.code,
          inst.panelId,
          `panel ${inst.panelId}: ${error.message}`,
        );
      }
      throw error;
    }
  }
  return ctx.out;
}
