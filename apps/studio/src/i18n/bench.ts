import { BENCH_TOLERANCES, type FabricProperty } from '@atelier/drape';
import type { BenchError, ImportNotice, ReportImportError, Verdict } from '@atelier/features';
import { frBench } from './fr-bench.js';
import type { CoreMessageKey } from './fr.js';
import {
  hasMessage,
  registerMessages,
  STRICT_MESSAGES,
  translate,
  type MessageValues,
} from './t.js';

// Le catalogue du banc est chargé avec l'écran : enregistré avant tout rendu de ses composants.
registerMessages(frBench);

/** Clés du catalogue du banc ; `tBench` accepte aussi celles de l'entrée (unités, erreurs communes). */
export type BenchMessageKey = keyof typeof frBench | CoreMessageKey;

/** Traduit une clé du banc : importer `tBench` garantit l'enregistrement du catalogue du banc. */
export function tBench(key: BenchMessageKey, values?: MessageValues): string {
  return translate(key, values, STRICT_MESSAGES);
}

/** Traduit une clé construite à partir d'une donnée ; une valeur inconnue du catalogue reste telle quelle. */
function lookup(key: string, fallback: string, values?: MessageValues): string {
  return hasMessage(key) ? tBench(key as BenchMessageKey, values) : fallback;
}

export const presetName = (preset: string): string => lookup(`fabric.preset.${preset}`, preset);
export const propertyName = (property: string): string =>
  lookup(`fabric.property.${property}`, property);
export const verdictLabel = (verdict: Verdict): string => tBench(`fabricBench.verdict.${verdict}`);

/** Libellé d'un champ d'essai ; `n` numérote une lecture d'une série. */
export const fieldLabel = (param: string, n = 1): string =>
  lookup(`fabricBench.field.${param}`, param, { n });
export const testTitle = (key: string): string => lookup(`fabricBench.test.${key}`, key);
export const testTip = (key: string): string | undefined =>
  hasMessage(`fabricBench.tip.${key}`) ? lookup(`fabricBench.tip.${key}`, '') : undefined;
export const optionLabel = (value: string): string => lookup(`fabricBench.option.${value}`, value);

const UNIT_SUFFIXES: readonly (readonly [string, BenchMessageKey])[] = [
  ['Mm2', 'unit.mm2'],
  ['Mm', 'unit.mm'],
  ['G', 'unit.g'],
  ['Deg', 'unit.deg'],
];

/** Unité d'un champ d'essai, lue dans le suffixe de son nom (`…Mm`, `…G`, `…Deg`, `…Mm2`). */
export function paramUnit(param: string): string {
  const found = UNIT_SUFFIXES.find(([suffix]) => param.endsWith(suffix));
  return tBench(found ? found[1] : 'unit.none');
}

/** Unité d'une grandeur du tissu (g/m², mm, %, µN·m ; vide pour le frottement). */
export const propertyUnit = (property: string): string =>
  lookup(`fabricBench.propUnit.${property}`, '');

/** Valeur d'une grandeur avec son unité. */
export function quantity(property: string, value: number): string {
  return tBench('fabricBench.valueUnit', { value, unit: propertyUnit(property) }).trim();
}

/** Erreur de saisie d'un essai ; `unit` est celle du champ, dans laquelle s'expriment les bornes. */
export function benchErrorMessage(error: BenchError, unit: string): string {
  switch (error.code) {
    case 'required':
      return tBench('error.required');
    case 'loaded-shorter':
      return tBench('fabricBench.error.loadedShorter');
    case 'range':
      return tBench('fabricBench.error.range', {
        exclusive: error.minExclusive ? 'yes' : 'no',
        min: error.min,
        max: error.max,
        unit,
      });
  }
}

const BYTES_PER_KIB = 1024;

export function importErrorMessage(error: ReportImportError): string {
  switch (error.code) {
    case 'too-large':
      return tBench('fabricBench.importError.too-large', {
        maxKib: error.maxBytes / BYTES_PER_KIB,
      });
    case 'not-json':
      return tBench('fabricBench.importError.not-json');
    case 'unsupported-version':
      return tBench('fabricBench.importError.unsupported-version');
    case 'invalid':
      return tBench('fabricBench.importError.invalid', {
        path: error.path,
        keyword: error.keyword,
      });
    case 'duplicate-preset':
      return tBench('fabricBench.importError.duplicate-preset', {
        preset: presetName(error.preset),
      });
  }
}

export function noticeMessage(notice: ImportNotice): string {
  switch (notice.code) {
    case 'simulations-dropped':
      return tBench('fabricBench.notice.simulations-dropped', {
        engineVersion: notice.engineVersion,
      });
    case 'estimate-changed':
      return tBench('fabricBench.notice.estimate-changed', { preset: presetName(notice.preset) });
  }
}

/** Tolérance d'une grandeur, lue dans le moteur : « ± 10 % » ou « ± 25 % (min. 0,05 mm) » si un plancher absolu s'applique. */
export function toleranceLabel(property: FabricProperty): string {
  const { relative, absolute } = BENCH_TOLERANCES[property];
  if (absolute === 0) return tBench('fabricBench.tolerance.relative', { relative });
  return tBench('fabricBench.tolerance.relativeFloor', {
    relative,
    floor: quantity(property, absolute),
  });
}
