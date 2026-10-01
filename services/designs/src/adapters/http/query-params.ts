import { problem } from '@atelier/service-kit';
import { failWith } from './problems.js';

const invalid = (detail: string): never => failWith(problem('invalid-request', 400, detail));

/** Entier décimal strict (pas de signe, d'espace ni d'exposant) entre min et max. */
export function integerParam(raw: unknown, name: string, min: number, max: number): number {
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw)) {
    return invalid(`Le paramètre ${name} doit être un entier.`);
  }
  const value = Number.parseInt(raw, 10);
  return value >= min && value <= max ? value : invalid(`Le paramètre ${name} est hors bornes.`);
}

const CURSOR_PREFIX = 'v1:';

/** Le curseur est opaque pour le client ; il contient le numéro de la dernière version rendue. */
export const encodeCursor = (lastNumber: number): string =>
  Buffer.from(`${CURSOR_PREFIX}${lastNumber}`).toString('base64url');

export function decodeCursor(raw: string): number {
  const text = /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? Buffer.from(raw, 'base64url').toString() : '';
  if (!text.startsWith(CURSOR_PREFIX)) return invalid('Le curseur est invalide.');
  return integerParam(text.slice(CURSOR_PREFIX.length), 'cursor', 1, Number.MAX_SAFE_INTEGER);
}
