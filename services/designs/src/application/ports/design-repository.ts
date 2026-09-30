import type { Design, DesignId, OrganizationId } from '../../domain/design.js';
import type { DesignVersion, VersionAdded } from '../../domain/design-version.js';

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
}
