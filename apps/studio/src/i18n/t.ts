import type { FieldError } from '@atelier/features';
import { IntlMessageFormat } from 'intl-messageformat';
import { fr, type MessageKey } from './fr.js';

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

/** Traduit une clé du catalogue ; une clé inconnue est refusée par TypeScript. */
export function t(key: MessageKey, values?: MessageValues): string {
  return formatMessage(fr[key], values);
}

export function problemMessage(type: string): string {
  const key = `problem.${type}`;
  return key in fr ? t(key as MessageKey) : t('problem.default');
}

/** Unité dans laquelle le champ est saisi (et donc dans laquelle ses bornes s'affichent). */
export type FieldUnit = 'cm' | 'mm';

/** Traduit une erreur de saisie : les bornes du modèle de vue (mm) sont converties vers l'unité du champ. */
export function fieldErrorMessage(error: FieldError, unit: FieldUnit): string {
  if (error.code === 'required') return t('error.required');
  const divisor = unit === 'cm' ? 10 : 1;
  return t('error.range', { unit, min: error.minMm / divisor, max: error.maxMm / divisor });
}
