import { describe, expect, it } from 'vitest';
import { addMoney, money } from './money.js';

describe('money', () => {
  it('refuse un montant à virgule', () => {
    expect(money(10.5, 'XOF').isErr()).toBe(true);
  });

  it('additionne deux montants de même devise', () => {
    const a = money(15000, 'XOF');
    const b = money(2500, 'XOF');
    if (a.isErr() || b.isErr()) throw new Error('montants invalides');
    const sum = addMoney(a.value, b.value);
    expect(sum.isOk() && sum.value).toEqual({ amountMinor: 17500, currency: 'XOF' });
  });

  it('refuse d’additionner deux devises différentes', () => {
    const a = money(100, 'XOF');
    const b = money(100, 'EUR');
    if (a.isErr() || b.isErr()) throw new Error('montants invalides');
    const sum = addMoney(a.value, b.value);
    expect(sum.isErr() && sum.error.kind).toBe('currency-mismatch');
  });
});
