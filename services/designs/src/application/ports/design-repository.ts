import type { Design, DesignId, OrganizationId } from '../../domain/design.js';
import type { DesignVersion, VersionAdded, VersionSummary } from '../../domain/design-version.js';

/** Persistance des modèles. Toute lecture est limitée à l'organisation de l'appelant. */
export interface DesignRepository {
  create(design: Design): Promise<void>;
  byId(organizationId: OrganizationId, designId: DesignId): Promise<Design | undefined>;
  /** Enregistre la version, le modèle et ses événements (outbox) dans une même transaction. */
  saveNewVersion(change: VersionAdded): Promise<void>;
  version(
    organizationId: OrganizationId,
    designId: DesignId,
    number: number,
  ): Promise<DesignVersion | undefined>;
  /**
   * Résumés des versions, numéro décroissant, au plus `limit`, seulement celles de numéro < `before`
   * (toutes si absent). Ne lit ni les mesures ni le patron. Vide pour un modèle d'une autre organisation.
   */
  versionSummaries(
    organizationId: OrganizationId,
    designId: DesignId,
    page: { limit: number; before?: number },
  ): Promise<VersionSummary[]>;
}
