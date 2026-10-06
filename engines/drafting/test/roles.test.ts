import type { EdgeSemanticRole } from '@atelier/contracts-ts';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { SEMANTIC_ROLES } from '../src/index.js';
import type { SemanticRole } from '../src/index.js';

describe('rôles sémantiques des bords', () => {
  it('sont ceux de GarmentSpec 1.1 : un écart de vocabulaire ne compile pas (pnpm typecheck)', () => {
    expectTypeOf<SemanticRole>().toEqualTypeOf<EdgeSemanticRole>();
    expect(new Set(SEMANTIC_ROLES).size).toBe(SEMANTIC_ROLES.length);
    expect(SEMANTIC_ROLES).toHaveLength(16);
  });
});
