import type { FabricBenchMeasurements, FabricDerivedValues } from '@atelier/contracts-ts';
import {
  candidateFabric,
  type CandidateFabric,
  compareToEstimate,
  type Deviation,
  deriveFabricValues,
  drapeCoefficientWithinTolerance,
  FABRIC_PRESETS,
  FABRIC_PROPERTIES,
  type FabricPhysics,
  type FabricPresetName,
  stripStretch,
} from '@atelier/drape';

import { type DrapeTest, type DrapeWhich, IDLE_DRAPE } from './cusick-runner.js';
import {
  COMMENT_MAX_LENGTH,
  type CorrectedDraft,
  type CorrectedErrors,
  FABRIC_BOUNDS,
  validateCorrected,
} from './fabric-bounds.js';
import { type BenchDraft, type BenchErrors, buildMeasurements } from './measurement-draft.js';
import { suggestVerdict, type Verdict } from './verdict.js';

export interface DrapeComparison {
  measured: number;
  simulated: number;
  withinTolerance: boolean;
}

/** Revue d'un préréglage : les entrées du modéliste, puis ce qui en est calculé (recalculé par `settle`). */
export interface PresetBenchState {
  preset: FabricPresetName;
  /** Valeurs estimées du préréglage courant du moteur. */
  estimated: FabricPhysics;
  // Entrées
  draft: BenchDraft;
  verdict: Verdict;
  /** Présent si et seulement si le verdict est `corrected`. */
  correctedDraft?: CorrectedDraft;
  comment: string;
  /** Dernière modification (ISO UTC) ; absent tant que la revue n'a pas été touchée. */
  reviewedAt?: string;
  /** Vrai dès que le modéliste a agi (ou qu'un rapport l'a rempli) : seules ces revues sont exportées. */
  touched: boolean;
  drapes: Record<DrapeWhich, DrapeTest>;
  // Calculé
  /** Essais complets et valides seulement. */
  measurements: FabricBenchMeasurements;
  errors: BenchErrors;
  derived: FabricDerivedValues;
  deviations: Deviation[];
  candidate: CandidateFabric;
  /** Allongement extrapolé (rapport de tension hors de 0,5 à 2), par sens. */
  extrapolated: { warp: boolean; weft: boolean };
  suggestedVerdict: Verdict;
  /** Présent quand les six valeurs corrigées sont dans les bornes de `Fabric`. */
  corrected?: FabricPhysics;
  correctedErrors: CorrectedErrors;
  commentError?: { code: 'too-long'; max: number };
  /** D'où vient le tissu de l'essai « candidat » : les valeurs corrigées valides, sinon les valeurs candidates. */
  candidateSource: 'corrected' | 'candidate';
  /** Coefficient de drapé mesuré comparé à chaque essai prêt ; absent sans mesure ou sans essai prêt. */
  drapeComparisons: Readonly<Record<DrapeWhich, DrapeComparison | undefined>>;
}

/** Les préréglages du moteur, dans l'ordre de `FABRIC_PRESETS`. */
export const PRESET_NAMES = Object.keys(FABRIC_PRESETS) as FabricPresetName[];

export const sameFabric = (a: FabricPhysics, b: FabricPhysics): boolean =>
  FABRIC_PROPERTIES.every((property) => a[property] === b[property]);

/** Tissu que simule chaque essai : l'estimation, ou les valeurs corrigées, sinon les valeurs candidates. */
export const simulatedFabric = (p: PresetBenchState, which: DrapeWhich): FabricPhysics =>
  which === 'estimated' ? p.estimated : (p.corrected ?? p.candidate.fabric);

const sourceOf = (p: PresetBenchState): PresetBenchState['candidateSource'] =>
  p.corrected ? 'corrected' : 'candidate';

const refreshDrape = (test: DrapeTest, fabric: FabricPhysics): DrapeTest =>
  test.fabric && !sameFabric(test.fabric, fabric) ? IDLE_DRAPE : test;

function extrapolation(m: FabricBenchMeasurements): PresetBenchState['extrapolated'] {
  return {
    warp: m.stretchWarp ? stripStretch(m.stretchWarp).extrapolated : false,
    weft: m.stretchWeft ? stripStretch(m.stretchWeft).extrapolated : false,
  };
}

function compareDrape(test: DrapeTest, measured: number | undefined): DrapeComparison | undefined {
  const run = test.status === 'ready' ? test.run : undefined;
  if (measured === undefined || !run) return undefined;
  const simulated = run.drapeCoefficient;
  return {
    measured,
    simulated,
    withinTolerance: drapeCoefficientWithinTolerance(measured, simulated),
  };
}

const codePoints = (text: string): number => [...text].length;

/** Recalcule tout ce qui se déduit des entrées ; deux appels sur le même état donnent le même résultat. */
export function settle(p: PresetBenchState): PresetBenchState {
  const { measurements, errors } = buildMeasurements(p.draft);
  const derived = deriveFabricValues(measurements, p.estimated);
  const candidate = candidateFabric(p.estimated, derived, FABRIC_BOUNDS);
  const deviations = compareToEstimate(p.estimated, derived);
  const check = p.correctedDraft ? validateCorrected(p.correctedDraft) : { errors: {} };
  const next: PresetBenchState = {
    ...p,
    measurements,
    errors,
    derived,
    deviations,
    candidate,
    extrapolated: extrapolation(measurements),
    corrected: check.corrected,
    correctedErrors: check.errors,
    commentError:
      codePoints(p.comment) > COMMENT_MAX_LENGTH
        ? { code: 'too-long', max: COMMENT_MAX_LENGTH }
        : undefined,
  };
  next.drapes = {
    estimated: refreshDrape(p.drapes.estimated, next.estimated),
    candidate: refreshDrape(p.drapes.candidate, simulatedFabric(next, 'candidate')),
  };
  next.candidateSource = sourceOf(next);
  const dc = measurements.drape?.drapeCoefficient;
  next.drapeComparisons = {
    estimated: compareDrape(next.drapes.estimated, dc),
    candidate: compareDrape(next.drapes.candidate, dc),
  };
  next.suggestedVerdict = suggestVerdict(deviations, {
    measured: measurements.drape?.drapeCoefficient,
    simulatedEstimated: next.drapeComparisons.estimated?.simulated,
  });
  return next;
}

/** Revue vierge d'un préréglage : to-review, rien de saisi. */
export function initialPresetState(preset: FabricPresetName): PresetBenchState {
  return settle({
    preset,
    estimated: { ...FABRIC_PRESETS[preset] },
    draft: {},
    verdict: 'to-review',
    comment: '',
    touched: false,
    drapes: { estimated: IDLE_DRAPE, candidate: IDLE_DRAPE },
  } as PresetBenchState);
}

/** Vrai si la revue peut figurer dans un rapport (valeurs corrigées et commentaire valides). */
export const isExportable = (p: PresetBenchState): boolean =>
  Object.keys(p.correctedErrors).length === 0 && p.commentError === undefined;
