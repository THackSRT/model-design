import type { FabricBenchMeasurements } from '@atelier/contracts-ts';

import { BENCH_TESTS, type BenchField, type BenchTest } from './measurement-fields.js';

/** Valeur saisie : un nombre, ou le choix d'une liste (surface d'appui). `undefined` : champ vidé. */
export type DraftValue = number | string;
/** Brouillon par champ, indexé par chemin : `weighing.sampleMassG`, `thickness.readingsMm.2`. */
export type BenchDraft = Readonly<Record<string, DraftValue | undefined>>;

/** Erreur de saisie : un code et ses paramètres, traduits par l'application. */
export type BenchError =
  | { code: 'required' }
  | { code: 'range'; min: number; max: number; minExclusive?: boolean }
  | { code: 'loaded-shorter' };
export type BenchErrors = Record<string, BenchError>;

export function setDraftValue(
  draft: BenchDraft,
  path: string,
  value: DraftValue | undefined,
): BenchDraft {
  const others = Object.entries(draft).filter(([key]) => key !== path);
  return Object.fromEntries(value === undefined ? others : [...others, [path, value]]);
}

const itemPath = (field: BenchField, index: number): string => `${field.path}.${index}`;

function seriesEntries(field: BenchField, draft: BenchDraft): [number, DraftValue][] {
  const entries: [number, DraftValue][] = [];
  for (let i = 0; i < (field.maxItems ?? 0); i += 1) {
    const value = draft[itemPath(field, i)];
    if (value !== undefined) entries.push([i, value]);
  }
  return entries;
}

function hasInput(field: BenchField, draft: BenchDraft): boolean {
  if (field.kind === 'fixed') return false;
  if (field.kind === 'series') return seriesEntries(field, draft).length > 0;
  return draft[field.path] !== undefined;
}

function rangeError(field: BenchField): BenchError {
  return {
    code: 'range',
    min: field.min ?? 0,
    max: field.max ?? 0,
    ...(field.minExclusive ? { minExclusive: true } : {}),
  };
}

function inRange(field: BenchField, value: DraftValue | undefined): value is number {
  if (typeof value !== 'number') return false;
  const min = field.min ?? 0;
  const aboveMin = field.minExclusive ? value > min : value >= min;
  return aboveMin && value <= (field.max ?? 0);
}

interface FieldRead {
  value?: unknown;
  errors: BenchErrors;
}

function readSeries(field: BenchField, draft: BenchDraft): FieldRead {
  const entries = seriesEntries(field, draft);
  if (entries.length === 0) return { errors: { [field.path]: { code: 'required' } } };
  const errors: BenchErrors = {};
  for (const [index, value] of entries) {
    if (!inRange(field, value)) errors[itemPath(field, index)] = rangeError(field);
  }
  return { value: entries.map(([, value]) => value), errors };
}

function readField(field: BenchField, draft: BenchDraft): FieldRead {
  if (field.kind === 'fixed') return { value: field.fixed, errors: {} };
  if (field.kind === 'series') return readSeries(field, draft);
  const value = draft[field.path];
  if (value === undefined) return { errors: { [field.path]: { code: 'required' } } };
  if (field.kind === 'choice') {
    const known = typeof value === 'string' && field.options?.includes(value) === true;
    return known ? { value, errors: {} } : { errors: { [field.path]: { code: 'required' } } };
  }
  return inRange(field, value)
    ? { value, errors: {} }
    : { errors: { [field.path]: rangeError(field) } };
}

interface TestRead {
  value: Record<string, unknown>;
  errors: BenchErrors;
}

/** Une longueur chargée plus courte que celle au repos est une faute de lecture (l'allongement serait négatif). */
function crossCheck(test: BenchTest, read: TestRead): void {
  const { gaugeLengthMm, loadedLengthMm } = read.value;
  if (typeof gaugeLengthMm === 'number' && typeof loadedLengthMm === 'number') {
    if (loadedLengthMm < gaugeLengthMm) {
      read.errors[`${test.key}.loadedLengthMm`] = { code: 'loaded-shorter' };
    }
  }
}

function readTest(test: BenchTest, draft: BenchDraft): TestRead {
  const read: TestRead = { value: {}, errors: {} };
  for (const field of test.fields) {
    const result = readField(field, draft);
    if (result.value !== undefined) read.value[field.param] = result.value;
    Object.assign(read.errors, result.errors);
  }
  crossCheck(test, read);
  return read;
}

export interface BuiltMeasurements {
  /** Seuls les essais complets et valides. */
  measurements: FabricBenchMeasurements;
  errors: BenchErrors;
}

/**
 * Brouillon -> mesures du contrat. Un essai sans aucune saisie est ignoré sans erreur ; un essai commencé
 * mais incomplet ou invalide a ses erreurs et n'entre pas dans les mesures.
 */
export function buildMeasurements(draft: BenchDraft): BuiltMeasurements {
  const measurements: Record<string, unknown> = {};
  const errors: BenchErrors = {};
  for (const test of BENCH_TESTS) {
    if (!test.fields.some((field) => hasInput(field, draft))) continue;
    const read = readTest(test, draft);
    if (Object.keys(read.errors).length === 0) measurements[test.key] = read.value;
    else Object.assign(errors, read.errors);
  }
  return { measurements: measurements as FabricBenchMeasurements, errors };
}

/** Mesures du contrat -> brouillon (import d'un rapport). */
export function draftFromMeasurements(measurements: FabricBenchMeasurements): BenchDraft {
  const draft: Record<string, DraftValue> = {};
  for (const test of BENCH_TESTS) {
    const values = measurements[test.key] as Record<string, unknown> | undefined;
    if (!values) continue;
    for (const field of test.fields) copyField(field, values[field.param], draft);
  }
  return draft;
}

function copyField(field: BenchField, value: unknown, draft: Record<string, DraftValue>): void {
  if (field.kind === 'fixed' || value === undefined) return;
  if (Array.isArray(value)) {
    (value as DraftValue[]).forEach((item, index) => {
      draft[itemPath(field, index)] = item;
    });
  } else draft[field.path] = value as DraftValue;
}
