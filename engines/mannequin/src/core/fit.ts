/*
 * Ajustement aux mesures du client : corpulence et musculature (fit-macro.ts), puis mensurations une
 * par une (sécante), enfin mise à l'échelle et pieds au sol.
 * Entrejambe (facultatif) : paire `upperleg` réglée par sécante dans la même boucle, comme le prototype.
 */
import { bounds } from './geometry.js';
import { type FitContext, macroFor, searchMacro, sweepWeight } from './fit-macro.js';
import { circumference, crotchHeight, measure } from './measure.js';
import { applyPair } from './morph.js';
import type {
  MakeHumanFit,
  MakeHumanMeasuresCm,
  MakeHumanMorphology,
  Measured,
  MhModel,
} from './types.js';

/** Zones ajustées, dans l'ordre. */
export const FIT_KEYS = [
  'chest',
  'waist',
  'hip',
  'neck',
  'bicep',
  'wrist',
  'thigh',
  'knee',
  'calf',
  'ankle',
] as const;

/** Zones ajustées par sécante : sous-poitrine d'abord, pour que la poitrine (réglée ensuite) reste exacte. */
const TARGET_KEYS = ['underbust', ...FIT_KEYS] as const;

/** Tolérance visée (cm) avant d'essayer d'autres musculatures. */
const TOLERANCE_CM = 0.6;
const ALT_MUSCLES = [0.75, 1, 0.5, 0.9, 0.25, 0];
const MAX_PAIR = 1.5;
const ROUNDS = 3;

interface Solution {
  pos: Float32Array;
  vals: Record<string, number>;
  meas: Measured;
  weight: number;
  muscle: number;
}

/** Tour sous-poitrine visé : seulement s'il est donné (pas d'estimation par défaut : elle déplaçait le bas du tronc). */
function underbustGoal(m: MakeHumanMeasuresCm): number {
  return m.underbust ?? 0;
}

/** Ventre et fessier : donnés, sinon valeurs par défaut (les mêmes pour les deux sexes). */
function bellyAndSeat(p: MakeHumanMorphology): { belly: number; seat: number } {
  return { belly: p.belly ?? 0.2, seat: p.seat ?? 0.4 };
}

function buildContext(model: MhModel, m: MakeHumanMeasuresCm, p: MakeHumanMorphology): FitContext {
  const goals = { ...m, underbust: underbustGoal(m) } as Record<string, number | undefined>;
  const goal = (k: string): number => goals[k] ?? 0;
  return {
    model,
    stature: m.stature,
    crotch: m.crotch ?? 0,
    goal,
    targets: TARGET_KEYS.filter((k) => goal(k) > 0),
    base: {
      gender: p.sex === 'femme' ? 0 : 1,
      age: p.age || 30,
      african: p.african ?? 1,
      asian: p.asian ?? 0,
      caucasian: p.caucasian ?? 0,
    },
    ...bellyAndSeat(p),
    fixedMuscle: p.muscle ?? undefined,
  };
}

/** Corps de base auquel s'ajoutent les paires de mensuration `vals`. */
function compose(
  ctx: FitContext,
  macroPos: Float32Array,
  vals: Record<string, number>,
): Float32Array {
  const pos = Float32Array.from(macroPos);
  for (const k in vals) applyPair(ctx.model, pos, k, vals[k] as number);
  return pos;
}

/** Une étape de sécante : règle la paire `k` pour que le tour de la zone atteigne le tour visé. */
function secantStep(
  ctx: FitContext,
  macroPos: Float32Array,
  vals: Record<string, number>,
  k: string,
): void {
  const get = (v: number): number => {
    vals[k] = v;
    const pos = compose(ctx, macroPos, vals);
    const b = bounds(pos);
    return circumference(ctx.model, pos, k, ctx.stature / (b.maxY - b.minY)).value;
  };
  const goal = ctx.goal(k);
  const v0 = vals[k] || 0;
  const c0 = get(v0);
  const v1 = Math.max(-MAX_PAIR, Math.min(MAX_PAIR, v0 + (c0 < goal ? 0.2 : -0.2)));
  const c1 = get(v1);
  const slope = (c1 - c0) / (v1 - v0 || 1e-6);
  const v = Math.abs(slope) > 1e-3 ? v0 + (goal - c0) / slope : v0;
  vals[k] = Math.max(-MAX_PAIR, Math.min(MAX_PAIR, v));
}

/** Une étape de sécante sur la paire `upperleg` : règle la hauteur d'entrejambe (cm). */
export function crotchStep(
  ctx: FitContext,
  macroPos: Float32Array,
  vals: Record<string, number>,
): void {
  const get = (v: number): number => {
    vals['upperleg'] = v;
    const pos = compose(ctx, macroPos, vals);
    const b = bounds(pos);
    return (crotchHeight(ctx.model, pos, b.minY) * ctx.stature) / (b.maxY - b.minY);
  };
  const v0 = vals['upperleg'] || 0;
  const c0 = get(v0);
  // Pas d'essai vers l'intérieur de la plage : à la borne haute, on essaie en dessous.
  const v1 = v0 + 0.3 > 1 ? v0 - 0.3 : v0 + 0.3;
  const slope = (get(v1) - c0) / (v1 - v0 || 1e-6);
  const v = Math.abs(slope) > 1e-3 ? v0 + (ctx.crotch - c0) / slope : v0;
  vals['upperleg'] = Math.max(-1, Math.min(1, v));
}

/** Mensurations une par une (plusieurs tours de sécante). */
function measureFit(ctx: FitContext, macroPos: Float32Array): Omit<Solution, 'weight' | 'muscle'> {
  const vals: Record<string, number> = {};
  for (let round = 0; round < ROUNDS; round++) {
    for (const k of ctx.targets) secantStep(ctx, macroPos, vals, k);
    if (ctx.crotch > 0) crotchStep(ctx, macroPos, vals);
  }
  const pos = compose(ctx, macroPos, vals);
  return { pos, vals, meas: measure(ctx.model, pos, ctx.stature) };
}

/** Tours demandés par le client (la sous-poitrine, souvent estimée, n'entre pas dans les écarts). */
const asked = (ctx: FitContext): string[] => ctx.targets.filter((k) => k !== 'underbust');

const worstOf = (ctx: FitContext, meas: Measured): number =>
  Math.max(...asked(ctx).map((k) => Math.abs((meas[k] as number) - ctx.goal(k))));

const errOf = (ctx: FitContext, meas: Measured): number =>
  asked(ctx).reduce((a, k) => a + ((meas[k] as number) / ctx.goal(k) - 1) ** 2, 0);

function solveFor(ctx: FitContext, weight: number, muscle: number): Solution {
  return { ...measureFit(ctx, macroFor(ctx, weight, muscle)), weight, muscle };
}

/** Si une mesure reste hors tolérance, essaie d'autres musculatures. */
function retryMuscles(ctx: FitContext, first: Solution, bestMuscle: number): Solution {
  let sol = first;
  for (const mu of ALT_MUSCLES) {
    if (Math.abs(mu - bestMuscle) < 0.05) continue;
    const cand = solveFor(ctx, sweepWeight(ctx, mu).w, mu);
    if (worstOf(ctx, cand.meas) < worstOf(ctx, sol.meas)) sol = cand;
    if (worstOf(ctx, sol.meas) <= TOLERANCE_CM) break;
  }
  return sol;
}

/** Met à l'échelle de la stature et pose les pieds au sol (modifie `pos`). */
function scaleToFloor(pos: Float32Array, scale: number, minY: number): void {
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = (pos[i] as number) * scale;
    pos[i + 1] = ((pos[i + 1] as number) - minY) * scale;
    pos[i + 2] = (pos[i + 2] as number) * scale;
  }
}

/**
 * m : mesures (cm) — stature, neck, chest, waist, hip, bicep, wrist, thigh, knee, calf, ankle
 * p : morphologie — sex, age, muscle, african, asian, caucasian, belly (0..1), seat (0..1)
 */
export function fit(model: MhModel, m: MakeHumanMeasuresCm, p: MakeHumanMorphology): MakeHumanFit {
  const ctx = buildContext(model, m, p);
  const best = searchMacro(ctx);
  let sol = solveFor(ctx, best.w, best.mu);
  if (worstOf(ctx, sol.meas) > TOLERANCE_CM && ctx.fixedMuscle === undefined) {
    sol = retryMuscles(ctx, sol, best.mu);
  }
  scaleToFloor(sol.pos, sol.meas['scale'] as number, sol.meas['minY'] as number);
  const final = measure(model, sol.pos, null);
  return {
    pos: sol.pos,
    weight: sol.weight,
    muscle: sol.muscle,
    values: { ...sol.vals },
    measured: final,
    err: errOf(ctx, final),
    worst: worstOf(ctx, final),
  };
}
