import { describe, expect, it } from 'vitest';
import { jsonSchemas } from './index.js';

describe('contrats générés', () => {
  it('exposent chaque schéma JSON avec son identifiant', () => {
    expect(jsonSchemas.garmentSpec.$id).toMatch(/garment-spec\.schema\.json$/);
    expect(jsonSchemas.measurementSet.required).toContain('statureMm');
  });
});
