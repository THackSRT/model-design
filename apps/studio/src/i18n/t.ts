import type { FieldError } from '@atelier/features';
import { IntlMessageFormat } from 'intl-messageformat';
import { fr, type CoreMessageKey } from './fr.js';

/** Catalogue en cours : celui de l'entrée, complété par les catalogues chargés avec leur écran. */
const catalog: Record<string, string> = { ...fr };

/** Ajoute un catalogue (synchrone) ; à appeler à l'import du module d'un écran chargé à la demande. */
export function registerMessages(messages: Readonly<Record<string, string>>): void {
  Object.assign(catalog, messages);
}

export const hasMessage = (key: string): boolean => Object.hasOwn(catalog, key);

export const LOCALE = 'fr-FR';

export type MessageValues = Record<string, string | number>;

const cache = new Map<string, IntlMessageFormat>();

/** Formate un message ICU (pluriels, select, nombres et unités) ; les formateurs sont mis en cache. */
export function formatMessage(pattern: string, values: MessageValues = {}): string {
  let format = cache.get(pattern);
  if (!format) {
    format = new IntlMessageFormat(pattern, LOCALE);
    cache.set(pattern, format);
  }
  return String(format.format(values));
}

const reported = new Set<string>();

/**
 * Traduit une clé du catalogue courant. Une clé absente lève une erreur en développement et en test (elle se voit
 * tout de suite) ; en production elle est signalée une fois par clé et rend une chaîne vide, jamais une page blanche.
 */
export function translate(
  key: string,
  values: MessageValues | undefined,
  strict: boolean,
  report: (message: string) => void = console.error,
): string {
  const pattern = Object.hasOwn(catalog, key) ? catalog[key] : undefined;
  if (pattern !== undefined) return formatMessage(pattern, values);
  const message = `Texte absent du catalogue : ${key}`;
  if (strict) throw new Error(message);
  if (!reported.has(key)) {
    reported.add(key);
    report(message);
  }
  return '';
}

/** Vrai en développement et en test : une clé absente y est une erreur. */
export const STRICT_MESSAGES: boolean = import.meta.env.DEV || import.meta.env.MODE === 'test';

/** Traduit une clé du catalogue d'entrée ; une clé inconnue (ou propre au banc : voir `tBench`) est refusée par TypeScript. */
export function t(key: CoreMessageKey, values?: MessageValues): string {
  return translate(key, values, STRICT_MESSAGES);
}

export function problemMessage(type: string): string {
  const key = `problem.${type}`;
  return hasMessage(key) ? t(key as CoreMessageKey) : t('problem.default');
}

/** Message d'un drapé en échec : un par type connu du contrat, un message générique sinon. */
export function drapeProblemMessage(type: string | undefined): string {
  const key = `drape.problem.${type?.replace('/problems/drape-', '') ?? ''}`;
  return t(hasMessage(key) ? (key as CoreMessageKey) : 'drape.problem.default');
}

/** Unité dans laquelle le champ est saisi (et donc dans laquelle ses bornes s'affichent). */
export type FieldUnit = 'cm' | 'mm';

/** Traduit une erreur de saisie : les bornes du modèle de vue (mm) sont converties vers l'unité du champ. */
export function fieldErrorMessage(error: FieldError, unit: FieldUnit): string {
  const divisor = unit === 'cm' ? 10 : 1;
  switch (error.code) {
    case 'required':
      return t('error.required');
    case 'unavailable':
      return t('error.unavailable');
    case 'ratioRange':
      return t('error.ratioRange', { min: error.min, max: error.max });
    case 'easeRange':
      return t('error.easeRange', { unit, min: error.minMm / divisor, max: error.maxMm / divisor });
    case 'zeroOrRange':
      return t('error.zeroOrRange', {
        unit,
        min: error.minMm / divisor,
        max: error.maxMm / divisor,
      });
    case 'range':
      return t('error.range', { unit, min: error.minMm / divisor, max: error.maxMm / divisor });
  }
}

/** Nom d'un type de vêtement ; un type du contrat inconnu du studio garde son identifiant. */
export function garmentName(type: string): string {
  const key = `garment.${type}`;
  return hasMessage(key) ? t(key as CoreMessageKey) : type;
}

/** Libellé d'un paramètre d'un type de vêtement ; un paramètre inconnu du catalogue reçoit un libellé générique, jamais son nom brut. */
export function paramLabel(type: string, param: string): string {
  const key = `param.${type}.${param}`;
  return t(hasMessage(key) ? (key as CoreMessageKey) : 'param.other');
}
