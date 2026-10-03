import type { FabricPhysics, FabricProperty } from '@atelier/drape';

import { type PresetBenchState, settle, sameFabric, simulatedFabric } from './bench-model.js';
import type { CusickRun, DrapeTest, DrapeWhich } from './cusick-runner.js';
import { roundToThreeDigits } from './fabric-bounds.js';
import { type DraftValue, setDraftValue } from './measurement-draft.js';
import type { Verdict } from './verdict.js';

/** Toute modification d'une revue la date (ISO UTC, suffixe Z) et la marque comme touchée. */
function stamp(p: PresetBenchState, now: Date): PresetBenchState {
  return { ...p, touched: true, reviewedAt: now.toISOString() };
}

export function editField(
  p: PresetBenchState,
  path: string,
  value: DraftValue | undefined,
  now: Date,
): PresetBenchState {
  return settle(stamp({ ...p, draft: setDraftValue(p.draft, path, value) }, now));
}

/** `corrected` préremplit les valeurs corrigées avec les valeurs candidates (3 chiffres significatifs). */
export function editVerdict(p: PresetBenchState, verdict: Verdict, now: Date): PresetBenchState {
  if (p.verdict === verdict) return p;
  const correctedDraft = verdict === 'corrected' ? prefill(p) : undefined;
  return settle(stamp({ ...p, verdict, correctedDraft }, now));
}

const prefill = (p: PresetBenchState): FabricPhysics => roundToThreeDigits(p.candidate.fabric);

export function editCorrected(
  p: PresetBenchState,
  property: FabricProperty,
  value: number | undefined,
  now: Date,
): PresetBenchState {
  if (p.verdict !== 'corrected') return p;
  return settle(stamp({ ...p, correctedDraft: { ...p.correctedDraft, [property]: value } }, now));
}

export function editComment(p: PresetBenchState, comment: string, now: Date): PresetBenchState {
  return settle(stamp({ ...p, comment }, now));
}

/** L'essai passe à « en cours » avec le tissu simulé, pour reconnaître plus tard un résultat périmé. */
export function startDrape(p: PresetBenchState, which: DrapeWhich): PresetBenchState {
  const test: DrapeTest = { status: 'running', fabric: simulatedFabric(p, which) };
  return { ...p, drapes: { ...p.drapes, [which]: test } };
}

type Outcome = { run: CusickRun } | { failed: true };

/** Fin d'un essai lancé pour `fabric` (le tissu simulé au lancement). */
export interface DrapeDone {
  which: DrapeWhich;
  fabric: FabricPhysics;
  outcome: Outcome;
}

/** Un résultat n'est gardé que si l'essai est toujours en cours pour le même tissu simulé. */
export function finishDrape(p: PresetBenchState, done: DrapeDone, now: Date): PresetBenchState {
  const { which, fabric: launched, outcome } = done;
  const current = p.drapes[which];
  if (current.status !== 'running' || !current.fabric || !sameFabric(current.fabric, launched)) {
    return p;
  }
  if ('failed' in outcome) {
    return { ...p, drapes: { ...p.drapes, [which]: { status: 'failed', fabric: launched } } };
  }
  const ready: DrapeTest = { status: 'ready', fabric: launched, run: outcome.run };
  return settle(stamp({ ...p, drapes: { ...p.drapes, [which]: ready } }, now));
}
