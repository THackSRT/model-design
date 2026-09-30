import type { OrganizationId } from '../../domain/design.js';

/**
 * Organisation de l'appelant. Phase 1 : une organisation de développement fixée par la configuration.
 * Phase 2 : lue dans le jeton interne vérifié (architecture, section 10.3), jamais dans un en-tête libre.
 */
export interface OrganizationContext {
  current(): OrganizationId;
}

export const fixedOrganization = (organizationId: string): OrganizationContext => ({
  current: () => organizationId as OrganizationId,
});
