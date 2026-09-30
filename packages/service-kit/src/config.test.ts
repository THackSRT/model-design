import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  const schema = z.object({ PORT: z.coerce.number().int().positive() });

  it('lit et convertit les variables', () => {
    expect(loadConfig(schema, { PORT: '3101' })).toEqual({ PORT: 3101 });
  });

  it('refuse de démarrer si une valeur manque', () => {
    expect(() => loadConfig(schema, {})).toThrow(/Configuration invalide/);
  });
});
