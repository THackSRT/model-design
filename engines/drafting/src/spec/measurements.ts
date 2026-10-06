import type { MeasurementSet } from '@atelier/contracts-ts';
import {
  InvalidMeasurementError,
  MissingMeasurementError,
  type MissingMeasurement,
} from '../core/errors.js';
import { roundMm } from '../core/round.js';

/** Mesures FreeSewing par nom : en millimètres, sauf `shoulderSlope` en degrés. */
export type FreeSewingMeasurements = Readonly<Record<string, number>>;

/** Champs numériques de `MeasurementSet` (tout sauf `sex`). */
type Field = Exclude<keyof MeasurementSet, 'sex'>;

/** Les mesures qu'un modèle demande à FreeSewing : celles qu'il exige, et celles qu'il utilise si on les lui donne. */
export interface WantedMeasurements {
  readonly required: readonly string[];
  readonly optional: readonly string[];
}

/**
 * Du point d'encolure (HPS, FreeSewing) à la cervicale, en part du tour de cou : 5 %, la valeur par défaut de
 * `backNeckCutout` de Brian, qui place la cervicale sous le HPS. `backWaistLengthMm` part de la cervicale ;
 * `hpsToWaistBack` part du HPS : on ajoute cet écart (docs/composants/contrats.md : « convertir »).
 */
export const HPS_ABOVE_CERVICALE_RATIO = 0.05;

/** Une mesure FreeSewing et la façon de la tirer d'un `MeasurementSet` (docs/composants/contrats.md). */
interface Rule {
  /** Nom FreeSewing. */
  readonly name: string;
  /** Champs que la règle exige ; elle ne s'applique que s'ils sont tous présents. */
  readonly from: readonly Field[];
  /** Champs facultatifs qu'elle lit aussi, contrôlés quand ils sont présents. */
  readonly also?: readonly Field[];
  readonly derive: (set: MeasurementSet) => number;
}

const num = (set: MeasurementSet, field: Field): number => set[field] as number;

const direct = (name: string, field: Field): Rule => ({
  name,
  from: [field],
  derive: (set) => num(set, field),
});

const difference = (name: string, minuend: Field, subtrahend: Field): Rule => ({
  name,
  from: [minuend, subtrahend],
  derive: (set) => num(set, minuend) - num(set, subtrahend),
});

/** Femme : `chest` vient du tour de buste s'il est fourni, sinon du tour de poitrine ; homme : tour de poitrine. */
const chest: Rule = {
  name: 'chest',
  from: ['chestGirthMm'],
  also: ['bustGirthMm'],
  derive: (set) =>
    set.sex === 'female' && set.bustGirthMm !== undefined
      ? set.bustGirthMm
      : num(set, 'chestGirthMm'),
};

const hpsToWaistBack: Rule = {
  name: 'hpsToWaistBack',
  from: ['backWaistLengthMm', 'neckGirthMm'],
  derive: (set) =>
    num(set, 'backWaistLengthMm') + HPS_ABOVE_CERVICALE_RATIO * num(set, 'neckGirthMm'),
};

/** Correspondance de docs/composants/contrats.md, ligne par ligne. */
const RULES: readonly Rule[] = [
  direct('neck', 'neckGirthMm'),
  chest,
  direct('highBust', 'highBustGirthMm'),
  direct('underbust', 'underBustGirthMm'),
  direct('waist', 'waistGirthMm'),
  direct('hips', 'upperHipGirthMm'),
  direct('seat', 'hipGirthMm'),
  direct('waistBack', 'waistGirthBackMm'),
  direct('seatBack', 'hipGirthBackMm'),
  direct('biceps', 'upperArmGirthMm'),
  direct('wrist', 'wristGirthMm'),
  direct('upperLeg', 'thighGirthMm'),
  direct('knee', 'kneeGirthMm'),
  direct('ankle', 'ankleGirthMm'),
  direct('inseam', 'crotchHeightMm'),
  direct('waistToFloor', 'waistHeightMm'),
  difference('waistToSeat', 'waistHeightMm', 'hipHeightMm'),
  difference('waistToKnee', 'waistHeightMm', 'kneeHeightMm'),
  hpsToWaistBack,
  direct('hpsToWaistFront', 'frontWaistLengthMm'),
  direct('hpsToBust', 'neckShoulderToBustPointMm'),
  direct('bustSpan', 'bustPointWidthMm'),
  direct('shoulderToShoulder', 'shoulderWidthMm'),
  direct('shoulderSlope', 'shoulderSlopeDeg'),
  direct('shoulderToWrist', 'armLengthMm'),
  direct('waistToArmpit', 'waistToArmpitMm'),
  direct('waistToHips', 'waistToUpperHipMm'),
  direct('waistToUpperLeg', 'waistToThighMm'),
  direct('crossSeam', 'crotchLengthMm'),
  direct('crossSeamFront', 'frontCrotchLengthMm'),
];

/** Noms FreeSewing que l'on sait tirer d'un `MeasurementSet`. */
export const DERIVABLE_MEASUREMENTS: readonly string[] = RULES.map((rule) => rule.name);

/**
 * Plus grande mesure acceptée : 5 m, plus du double du plus grand maximum du contrat (stature de 2,3 m). Les
 * ajustements itératifs de FreeSewing (manche, col) allongent leur calcul avec l'échelle : 22 s pour cent mille fois
 * une taille, plus d'une minute au-delà. Un jeu absurde ne doit pas bloquer le fil qui trace.
 */
export const MAX_MEASUREMENT_MM = 5000;

/** La pente d'épaule reste sous l'angle droit (FreeSewing échoue à 90°). */
export const MAX_SLOPE_DEG = 90;

const LENGTH_REASON = `must be a finite number above 0 and at most ${MAX_MEASUREMENT_MM} mm`;
const SLOPE_REASON = `must be a finite angle from 0 to under ${MAX_SLOPE_DEG} degrees`;

/** Une longueur est un nombre fini, positif, d'au plus 5 m ; la pente d'épaule va de 0 à moins de 90 degrés. */
function problemWith(value: unknown, isSlope: boolean): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return isSlope ? SLOPE_REASON : LENGTH_REASON;
  const usable = isSlope
    ? value >= 0 && value < MAX_SLOPE_DEG
    : value > 0 && value <= MAX_MEASUREMENT_MM;
  return usable ? undefined : isSlope ? SLOPE_REASON : LENGTH_REASON;
}

/** Champs absents qui empêchent d'appliquer la règle. */
const absentFields = (rule: Rule, set: MeasurementSet): Field[] =>
  rule.from.filter((field) => set[field] === undefined);

function evaluate(rule: Rule, set: MeasurementSet): number {
  for (const field of [...rule.from, ...(rule.also ?? [])]) {
    const problem =
      set[field] === undefined ? undefined : problemWith(set[field], field === 'shoulderSlopeDeg');
    if (problem !== undefined) throw new InvalidMeasurementError(field, problem);
  }
  // Une différence inversée (hanches plus hautes que la taille) n'a pas de sens : on la refuse.
  const value = roundMm(rule.derive(set));
  const problem = problemWith(value, rule.name === 'shoulderSlope');
  if (problem !== undefined) throw new InvalidMeasurementError(rule.from.join(' - '), problem);
  return value;
}

/** Mesures exigées qui manquent au jeu, avec les champs qui les fourniraient. */
function missingOf(set: MeasurementSet, required: readonly string[]): MissingMeasurement[] {
  const missing: MissingMeasurement[] = [];
  for (const name of required) {
    const rule = RULES.find((candidate) => candidate.name === name);
    const fields = rule === undefined ? [] : absentFields(rule, set);
    if (rule === undefined || fields.length > 0) missing.push({ measurement: name, fields });
  }
  return missing;
}

/**
 * Convertit un `MeasurementSet` en mesures FreeSewing pour un modèle : les mesures qu'il exige (toutes, sinon
 * `MissingMeasurementError` les nomme) et celles qu'il utilise s'il les trouve. Les mesures tirées de plusieurs champs
 * sont arrondies à 0,001 mm. Une mesure inutilisable donne `InvalidMeasurementError`.
 */
export function toFreeSewingMeasurements(
  model: string,
  set: MeasurementSet,
  wanted: WantedMeasurements,
): FreeSewingMeasurements {
  const missing = missingOf(set, wanted.required);
  if (missing.length > 0) throw new MissingMeasurementError(model, missing);
  const names = [
    ...wanted.required,
    ...wanted.optional.filter((name) => !missingOf(set, [name]).length),
  ];
  const result: Record<string, number> = {};
  for (const name of names) {
    const rule = RULES.find((candidate) => candidate.name === name) as Rule;
    result[name] = evaluate(rule, set);
  }
  return result;
}
