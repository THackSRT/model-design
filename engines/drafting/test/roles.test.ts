import type { Edge, EdgeSemanticRole, PanelPlacement } from '@atelier/contracts-ts';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { EDGE_ROLES, SEMANTIC_ROLES } from '../src/index.js';
import type { EdgeRole, PlacementSheet, SemanticRole } from '../src/index.js';

describe('rôles sémantiques des bords', () => {
  it('sont ceux de GarmentSpec 1.1 : un écart de vocabulaire ne compile pas (pnpm typecheck)', () => {
    expectTypeOf<SemanticRole>().toEqualTypeOf<EdgeSemanticRole>();
    expect(new Set(SEMANTIC_ROLES).size).toBe(SEMANTIC_ROLES.length);
    expect(SEMANTIC_ROLES).toHaveLength(16);
  });
});

describe('vocabulaire de la fiche de couture', () => {
  it('les rôles structurels sont ceux de Edge.role : un écart ne compile pas (pnpm typecheck)', () => {
    expectTypeOf<EdgeRole>().toEqualTypeOf<NonNullable<Edge['role']>>();
    expect(new Set(EDGE_ROLES).size).toBe(EDGE_ROLES.length);
    expect(EDGE_ROLES).toHaveLength(5);
  });

  it('la pose a les valeurs de PanelPlacement : zone, côté, face et repère de hauteur', () => {
    expectTypeOf<PlacementSheet['zone']>().toEqualTypeOf<PanelPlacement['zone']>();
    expectTypeOf<PlacementSheet['bodySide']>().toEqualTypeOf<PanelPlacement['bodySide']>();
    expectTypeOf<PlacementSheet['facing']>().toEqualTypeOf<PanelPlacement['facing']>();
    expectTypeOf<PlacementSheet['landmark']>().toEqualTypeOf<
      PanelPlacement['anchor']['landmark']
    >();
  });
});
