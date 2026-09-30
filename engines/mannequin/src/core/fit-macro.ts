/*
 * Ajustement, étape 1 : corpulence et musculature. Recherche sur grille puis affinage, pour
 * approcher poitrine, taille et bassin ; balayage de la corpulence à musculature donnée.
 */
import { bounds } from './geometry.js';
import { circumference } from './measure.js';
import { applyPair, macro } from './morph.js';
import type { MacroParams, MhModel } from './types.js';

/** Données de l'ajustement, communes à toutes ses étapes. */
export interface FitContext {
  model: MhModel;
  /** Stature visée (cm). */
  stature: number;
  /** Tour visé (cm) pour une zone ; 0 si absent. */
  goal: (key: string) => number;
  /** Zones à ajuster (tours demandés), dans l'ordre. */
  targets: string[];
  base: Omit<MacroParams, 'weight' | 'muscle'>;
  belly: number;
  seat: number;
  /** Musculature imposée par l'appelant, sinon recherchée. */
  fixedMuscle: number | undefined;
}

export interface MacroChoice {
  w: number;
  mu: number;
  e: number;
}

const GRID_MUSCLE = [0, 0.25, 0.5, 0.75, 1];
const GRID_WEIGHT = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1];
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Corps de base pour une corpulence et une musculature, avec ventre et fessier. */
export function macroFor(ctx: FitContext, weight: number, muscle: number): Float32Array {
  const pos = macro(ctx.model, { ...ctx.base, weight, muscle });
  applyPair(ctx.model, pos, 'belly', (ctx.belly - 0.2) * 1.2);
  applyPair(ctx.model, pos, 'seat', (ctx.seat - 0.4) * 1.2);
  return pos;
}

/** Écart relatif cumulé sur poitrine, taille et bassin. */
export function macroErr(ctx: FitContext, w: number, mu: number): number {
  const pos = macroFor(ctx, w, mu);
  const b = bounds(pos);
  const s = ctx.stature / (b.maxY - b.minY);
  return ['chest', 'waist', 'hip'].reduce(
    (a, k) => a + (circumference(ctx.model, pos, k, s).value / ctx.goal(k) - 1) ** 2,
    0,
  );
}

/** Affinage par pas décroissants autour de `start`. */
function refine(ctx: FitContext, start: MacroChoice): MacroChoice {
  let best = start;
  for (let step = 0.1; step > 0.01; step /= 2) {
    const moves = [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ] as const;
    for (const [dw, dm] of moves) {
      if (ctx.fixedMuscle !== undefined && dm) continue;
      const w = clamp01(best.w + dw);
      const mu = clamp01(best.mu + dm);
      const e = macroErr(ctx, w, mu);
      if (e < best.e) best = { w, mu, e };
    }
  }
  return best;
}

/** Meilleure corpulence et musculature : grille, puis affinage. */
export function searchMacro(ctx: FitContext): MacroChoice {
  const fixed = ctx.fixedMuscle;
  let best: MacroChoice = { w: 0.5, mu: fixed ?? 0.5, e: Infinity };
  for (const mu of fixed === undefined ? GRID_MUSCLE : [fixed]) {
    for (const w of GRID_WEIGHT) {
      const e = macroErr(ctx, w, mu);
      if (e < best.e) best = { w, mu, e };
    }
  }
  return refine(ctx, best);
}

/** Meilleure corpulence pour une musculature donnée (balayage de 0 à 1 par dixièmes). */
export function sweepWeight(ctx: FitContext, mu: number): { w: number; e: number } {
  let best = { w: 0.5, e: Infinity };
  for (let w = 0; w <= 1.001; w += 0.1) {
    const e = macroErr(ctx, w, mu);
    if (e < best.e) best = { w, e };
  }
  return best;
}
