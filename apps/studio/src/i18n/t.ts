import { fr, type MessageKey } from './fr.js';

/** Traduction minimale avec paramètres nommés ({number}). Bibliothèque ICU à choisir en phase 1. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return fr[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function problemMessage(type: string): string {
  const key = `problem.${type}`;
  return key in fr ? fr[key as MessageKey] : fr['problem.default'];
}
