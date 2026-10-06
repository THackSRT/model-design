/*
 * Lecture à la demande d'un corps ajusté (tâche 1.61a) : repères du corps et mesures du contrat qu'on en déduit.
 * `fit` ne calcule rien de cela (environ 80 ms) : il garde seulement le corps au repos de chaque corps ajusté,
 * et les fonctions ci-dessous le lisent la première fois qu'on les appelle, une seule fois par corps.
 *
 * Le corps au repos n'est pas dans `FittedMannequin` (il alourdirait chaque message vers un Worker) : il est gardé à
 * côté, dans ce contexte d'exécution. Une copie structurée du corps ajusté (message d'un Worker) ou une doublure
 * de test n'a donc rien à lire : c'est une erreur, jamais une valeur inventée. Dans le studio, lire dans le Worker.
 */
import type { MeasurementSet } from '@atelier/contracts-ts';
import { type BodyInput, type BodyReading, readBody } from './core/derive.js';
import {
  type BodyLandmarksMm,
  DERIVED_KEYS,
  type DerivedMeasurements,
  fillMissing,
  toBodyLandmarksMm,
  toDerivedMeasurements,
} from './derived.js';
import type { FittedMannequin } from './index.js';

/** Ce qui est gardé d'un corps ajusté : le corps au repos, puis la lecture quand elle a été faite. */
interface Kept {
  rest?: BodyInput;
  reading?: BodyReading;
}

const kept = new WeakMap<FittedMannequin, Kept>();

/** Garde le corps au repos d'un corps ajusté, sans le lire : appelé par `fit`. */
export function keepRestBody(fitted: FittedMannequin, rest: BodyInput): void {
  kept.set(fitted, { rest });
}

/** Lecture du corps (cm), faite à la première demande ; le corps au repos est alors libéré. */
function readingOf(fitted: FittedMannequin): BodyReading {
  const entry = kept.get(fitted);
  if (!entry) {
    throw new Error(
      "Lecture impossible : ce corps ne vient pas de `fit` dans ce contexte d'exécution (copie structurée ou doublure)",
    );
  }
  if (!entry.reading) {
    entry.reading = readBody(entry.rest as BodyInput);
    delete entry.rest;
  }
  return entry.reading;
}

/**
 * Repères du corps ajusté au repos, à gauche et à droite, en mm (point d'encolure à l'épaule, acromion, aisselle,
 * crête iliaque). Indépendants de `armAngleDeg`. `fitted` doit venir de `fit` dans ce contexte d'exécution.
 */
export const sideLandmarks = (fitted: FittedMannequin): BodyLandmarksMm =>
  toBodyLandmarksMm(readingOf(fitted));

/**
 * Les onze mesures de `MeasurementSet` ajoutées pour FreeSewing (1.54a), lues sur le corps ajusté au repos : toutes
 * présentes, entiers dans les bornes du contrat. `fitted` doit venir de `fit` dans ce contexte d'exécution.
 */
export const deriveMeasurements = (fitted: FittedMannequin): DerivedMeasurements =>
  toDerivedMeasurements(readingOf(fitted).measures);

/**
 * Le jeu de mesures fourni, complété des mesures lues sur le corps pour celles qui lui manquent. Une mesure fournie
 * n'est jamais remplacée : elle prime toujours. Le corps n'est lu que s'il manque l'une des onze mesures.
 */
export function completeMeasurements(
  provided: MeasurementSet,
  fitted: FittedMannequin,
): MeasurementSet {
  const missing = DERIVED_KEYS.some((key) => provided[key] === undefined);
  return missing ? fillMissing(provided, deriveMeasurements(fitted)) : { ...provided };
}
