import { describe, expect, it } from 'vitest';
import * as contracts from './index.js';
import { jsonSchemas } from './index.js';

describe('contrats générés', () => {
  it('exposent chaque schéma JSON avec son identifiant', () => {
    expect(jsonSchemas.garmentSpec.$id).toMatch(/garment-spec\.schema\.json$/);
    expect(jsonSchemas.measurementSet.required).toContain('statureMm');
  });
});

describe('constantes par schéma', () => {
  it('chaque clé de jsonSchemas a sa constante nommée, même référence', () => {
    const named = contracts as Record<string, unknown>;
    const keys = Object.keys(jsonSchemas);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(named[`${key}JsonSchema`], key).toBe((jsonSchemas as Record<string, unknown>)[key]);
    }
  });
});
