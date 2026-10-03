import type { FabricPresetReview, FabricValidationReport } from '@atelier/contracts-ts';
import { ENGINE_VERSION, type FabricPresetName } from '@atelier/drape';

import {
  initialPresetState,
  PRESET_NAMES,
  type PresetBenchState,
  sameFabric,
  settle,
} from './bench-model.js';
import { type DrapeTest, type DrapeWhich, IDLE_DRAPE } from './cusick-runner.js';
import { draftFromMeasurements } from './measurement-draft.js';

/** Avis affiché après un import. */
export type ImportNotice =
  | { code: 'simulations-dropped'; engineVersion: string }
  | { code: 'estimate-changed'; preset: FabricPresetName };

type SimulatedDrape = NonNullable<FabricPresetReview['simulatedDrape']>;

const DRAPE_KEYS: readonly DrapeWhich[] = ['estimated', 'candidate'];

function simulatedOf(p: PresetBenchState): SimulatedDrape | undefined {
  const out: SimulatedDrape = {};
  for (const which of DRAPE_KEYS) {
    const { status, fabric, run } = p.drapes[which];
    if (status !== 'ready' || !fabric || !run) continue;
    out[which] = {
      fabric,
      drapeCoefficient: run.drapeCoefficient,
      converged: run.converged,
      simulatedSteps: run.simulatedSteps,
    };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function reviewOf(p: PresetBenchState, now: Date): FabricPresetReview {
  const review: FabricPresetReview = {
    preset: p.preset,
    verdict: p.verdict,
    reviewedAt: p.reviewedAt ?? now.toISOString(),
    estimated: p.estimated,
  };
  if (Object.keys(p.measurements).length > 0) {
    review.measurements = p.measurements;
    review.derived = p.derived;
  }
  if (p.verdict === 'corrected' && p.corrected) review.corrected = p.corrected;
  const simulated = simulatedOf(p);
  if (simulated) review.simulatedDrape = simulated;
  if (p.comment !== '') review.comment = p.comment;
  return review;
}

/** Rapport du contrat : les revues touchées seulement, grandeurs déduites recalculées, essais prêts seulement. */
export function toReport(
  core: { presets: readonly PresetBenchState[]; createdAt: string },
  now: Date,
): FabricValidationReport {
  const reviews = core.presets.filter((p) => p.touched).map((p) => reviewOf(p, now));
  return {
    schemaVersion: '1.0',
    createdAt: core.createdAt,
    updatedAt: now.toISOString(),
    engineVersion: ENGINE_VERSION,
    reviews: reviews as FabricValidationReport['reviews'],
  };
}

function importedDrapes(simulated: SimulatedDrape | undefined, engineVersion: string) {
  const drapes: Record<DrapeWhich, DrapeTest> = { estimated: IDLE_DRAPE, candidate: IDLE_DRAPE };
  for (const which of DRAPE_KEYS) {
    const sim = simulated?.[which];
    if (!sim) continue;
    const { fabric, drapeCoefficient, converged, simulatedSteps } = sim;
    drapes[which] = {
      status: 'ready',
      fabric,
      run: {
        drapeCoefficient,
        converged,
        simulatedSteps,
        outlineMm: new Float64Array(0),
        engineVersion,
      },
    };
  }
  return drapes;
}

function importReview(
  review: FabricPresetReview,
  report: FabricValidationReport,
  notices: ImportNotice[],
): PresetBenchState {
  const base = initialPresetState(review.preset);
  const changed = !sameFabric(review.estimated, base.estimated);
  if (changed) notices.push({ code: 'estimate-changed', preset: review.preset });
  const verdict = changed ? 'to-review' : review.verdict;
  return settle({
    ...base,
    draft: draftFromMeasurements(review.measurements ?? {}),
    verdict,
    correctedDraft: verdict === 'corrected' ? review.corrected : undefined,
    comment: review.comment ?? '',
    reviewedAt: review.reviewedAt,
    touched: true,
    drapes:
      report.engineVersion === ENGINE_VERSION
        ? importedDrapes(review.simulatedDrape, report.engineVersion)
        : { estimated: IDLE_DRAPE, candidate: IDLE_DRAPE },
  });
}

export interface ImportedReport {
  presets: PresetBenchState[];
  createdAt: string;
  notices: ImportNotice[];
}

/**
 * État d'un rapport lu. Les mesures brutes font foi : `derived` est ignoré et recalculé. Les essais simulés
 * d'une autre version du moteur sont écartés ; une revue dont l'estimation n'est plus celle du préréglage
 * courant repasse à `to-review` (mesures et commentaire gardés).
 */
export function fromReport(report: FabricValidationReport): ImportedReport {
  const notices: ImportNotice[] = [];
  const hasSimulation = report.reviews.some((r) => r.simulatedDrape !== undefined);
  if (hasSimulation && report.engineVersion !== ENGINE_VERSION) {
    notices.push({ code: 'simulations-dropped', engineVersion: report.engineVersion });
  }
  const presets = PRESET_NAMES.map((name) => {
    const review = report.reviews.find((r) => r.preset === name);
    return review ? importReview(review, report, notices) : initialPresetState(name);
  });
  return { presets, createdAt: report.createdAt, notices };
}
