import type { GarmentSpec, Panel } from '@atelier/contracts-ts';
import type { GarmentMesh } from '../mesh/garment-mesh.js';
import { makeFrame, type Frame } from './frames.js';
import { pointAt } from './hull.js';
import { instancesOf, type Instance } from './instances.js';
import { legModes, legPieceOf, type LegPiece, type WrapMode } from './leg-align.js';
import { LEVEL_STEP_MM, createLevelStack, type LevelCurve, type LevelStack } from './levels.js';
import { createSectioner, type BodySectioner } from './section.js';
import { createShoulderFold, type ShoulderFold } from './shoulder-fold.js';
import { PlacementError, type AvatarShape } from './types.js';
import { pieceField, type PieceField } from './piece-field.js';
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
  /** Hauteur de l'entrejambe, mm (le pantalon passe de la jambe au bassin juste au-dessus). */
  crotchMm: number;
  /** Repli des parties hautes du tronc sur le profil de l'épaule. */
  fold: ShoulderFold;
  /** Repérage par la ligne d'ancrage des exemplaires du tronc et des jambes (les bras gardent l'ordonnée du patron). */
  fields: ReadonlyMap<Instance, PieceField>;
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

const wholeCurve = (level: LevelCurve, s: number): WrapMode => ({
  startArc: level.startArc,
  usableLength: level.curve.length,
  offsetMm: s,
});

/** Point (a, b) du plan de coupe pour un mode d'enroulement ; la courbe est agrandie si le tour fini la dépasse. */
function wrapped(level: LevelCurve, mode: WrapMode, total: number): [number, number] {
  const lambda = Math.max(1, (total * FLARE_MARGIN) / mode.usableLength);
  const q = pointAt(level.curve, mode.startArc + mode.offsetMm / lambda);
  return [
    level.centre[0] + lambda * (q[0] - level.centre[0]),
    level.centre[1] + lambda * (q[1] - level.centre[1]),
  ];
}

/** Hauteur du sommet v au-dessus de l'ancrage : par la ligne d'ancrage ou l'ordonnée du patron. */
function heightOf(ctx: Context, inst: Instance, v: number): number {
  const field = ctx.fields.get(inst);
  if (field) return -(field.d[v - inst.piece.vertexStart] as number);
  return (ctx.mesh.cloth.flatMm[2 * v + 1] as number) - inst.anchorV;
}

/**
 * Hauteur au-dessus de l'ancrage et point (a, b) du sommet v : ligne d'ancrage, bras (patron) ou tube d'une jambe.
 * `upMax` : hauteur de la coupe au plus (le repli de l'épaule prend le relais au-dessus).
 */
function planarPoint(
  ctx: Context,
  inst: Instance,
  v: number,
  how: { leg: LegPiece | undefined; upMax: number },
): { up: number; ab: [number, number] } {
  const { stack } = stackOf(ctx, inst);
  const field = ctx.fields.get(inst);
  const leg = how.leg;
  const up = Math.min(heightOf(ctx, inst, v), how.upMax);
  if (!field) {
    const s = (ctx.mesh.cloth.flatMm[2 * v] as number) - inst.piece.shiftXMm - inst.anchorU;
    const level = stack.curveAt(levelIndex(up));
    return { up, ab: wrapped(level, wholeCurve(level, s), ctx.circumference(inst, up)) };
  }
  const local = v - inst.piece.vertexStart;
  const [s, d] = [field.s[local] as number, -up];
  const level = stack.curveAt(levelIndex(-d));
  const total = ctx.circumference(inst, -d);
  if (!leg) return { up: -d, ab: wrapped(level, wholeCurve(level, field.abscissa(s, d)), total) };
  const at = { s, d, heightMm: inst.heightMm - d, crotchMm: ctx.crotchMm };
  const modes = legModes(leg, level, field, at);
  const low = wrapped(level, modes.low, total);
  if (!modes.high) return { up: -d, ab: low };
  const high = wrapped(level, modes.high, total);
  const w = modes.weight;
  return { up: -d, ab: [low[0] + w * (high[0] - low[0]), low[1] + w * (high[1] - low[1])] };
}

/** Point du sommet v : la coupe du corps, puis au-dessus de `shoulder` − 40 mm le repli sur le profil de l'épaule. */
function pointOf(
  ctx: Context,
  inst: Instance,
  v: number,
  leg: LegPiece | undefined,
): { up: number; ab: [number, number] } {
  const facing = inst.facing;
  const folds = inst.zone === 'torso' && (facing === 'front' || facing === 'back');
  const foldUp = ctx.fold.startMm - inst.heightMm;
  const excess = heightOf(ctx, inst, v) - foldUp;
  if (!folds || excess <= 0) return planarPoint(ctx, inst, v, { leg, upMax: Infinity });
  const base = planarPoint(ctx, inst, v, { leg, upMax: foldUp });
  const moved = ctx.fold.fold(facing, base.ab[0], inst.clearanceMm, excess);
  if (!moved) return planarPoint(ctx, inst, v, { leg, upMax: Infinity });
  return { up: moved.y - inst.heightMm, ab: [base.ab[0], base.ab[1] + moved.dz] };
}

function placeInstance(ctx: Context, inst: Instance): void {
  const { frame } = stackOf(ctx, inst);
  const { vertexStart, vertexCount } = inst.piece;
  const leg = legPieceOf(inst.zone, inst.side, inst.facing);
  for (let v = vertexStart; v < vertexStart + vertexCount; v++) {
    const { up, ab } = pointOf(ctx, inst, v, leg);
    const [a, b] = ab;
    const o = frame.origin(up);
    for (let k = 0; k < 3; k++) {
      ctx.out[3 * v + k] =
        (o[k] as number) + a * (frame.e1[k] as number) + b * (frame.e2[k] as number);
    }
  }
}

/** Repérage des exemplaires du tronc et des jambes par leur ligne d'ancrage. */
function fieldsOf(
  mesh: GarmentMesh,
  spec: GarmentSpec,
  instances: readonly Instance[],
): Map<Instance, PieceField> {
  const panels = new Map<string, Panel>(spec.panels.map((p) => [p.id, p]));
  const fields = new Map<Instance, PieceField>();
  for (const inst of instances) {
    if (inst.zone === 'arm') continue;
    const field = pieceField(mesh, inst.piece, panels.get(inst.panelId) as Panel, spec.seams);
    if (field) fields.set(inst, field);
  }
  return fields;
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
  const fields = fieldsOf(mesh, spec, instances);
  const sectioner = createSectioner(avatar.body);
  const ctx: Context = {
    mesh,
    avatar,
    sectioner,
    stacks: new Map(),
    circumference: circumferences(mesh, instances, fields),
    crotchMm: avatar.landmarksMm.crotch,
    fold: createShoulderFold(avatar, sectioner),
    fields,
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
