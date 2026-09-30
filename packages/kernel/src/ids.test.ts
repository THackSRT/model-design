import { describe, expect, it } from 'vitest';
import { isUuid, systemIdGenerator, uuidV7 } from './ids.js';

describe('uuidV7', () => {
  it('produit un UUID version 7 dont le début encode l’horodatage', () => {
    const id = uuidV7(0x0190_1234_5678, new Uint8Array(10).fill(0xff));
    expect(id).toBe('01901234-5678-7fff-bfff-ffffffffffff');
    expect(isUuid(id)).toBe(true);
  });

  it('refuse un aléa trop court', () => {
    expect(() => uuidV7(0, new Uint8Array(4))).toThrow(RangeError);
  });

  it('génère des identifiants triés dans le temps', () => {
    const first = systemIdGenerator.next<'order'>();
    const second = uuidV7(Date.now() + 1000, new Uint8Array(10));
    expect(first < second).toBe(true);
  });
});
