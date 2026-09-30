import { err, ok, type Result } from './result.js';

/** Codes ISO 4217 utilisés par la plateforme. XOF n'a pas de sous-unité : 1 = 1 franc. */
export type Currency = 'XOF' | 'XAF' | 'NGN' | 'GHS' | 'EUR' | 'USD';

/** Montant entier dans la plus petite unité de la devise ; jamais de nombre à virgule. */
export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

export type MoneyError = { kind: 'not-an-integer' } | { kind: 'currency-mismatch' };

export function money(amountMinor: number, currency: Currency): Result<Money, MoneyError> {
  if (!Number.isSafeInteger(amountMinor)) return err({ kind: 'not-an-integer' });
  return ok({ amountMinor, currency });
}

export function addMoney(a: Money, b: Money): Result<Money, MoneyError> {
  if (a.currency !== b.currency) return err({ kind: 'currency-mismatch' });
  return money(a.amountMinor + b.amountMinor, a.currency);
}
