import type { DesignId, OrganizationId } from '../../domain/design.js';
import type { Drape, DrapeId, DrapeOutcome, DrapeRequested } from '../../domain/drape.js';

export interface SavedDrapeRequest {
  drape: Drape;
  /** Faux : une demande identique existait déjà, rien n'a été écrit. */
  created: boolean;
}

/**
 * `applied` : le drapé était en attente, il est terminé ; `already-settled` : il l'était déjà, rien n'a changé ;
 * `unknown` : aucun drapé de cette organisation, version et identifiant.
 */
export type RecordedOutcome = 'applied' | 'already-settled' | 'unknown';

export interface DrapeLocation {
  organizationId: OrganizationId;
  designId: DesignId;
  versionNumber: number;
  drapeId: DrapeId;
}

/** Persistance des drapés. Toute lecture est limitée à l'organisation de l'appelant. */
export interface DrapeRepository {
  /**
   * Dans une seule transaction : rend le drapé non échoué (à `now`) de même version et même empreinte s'il
   * existe ; sinon enregistre `change.drape` et ses événements (outbox).
   */
  saveRequest(change: DrapeRequested, now: Date): Promise<SavedDrapeRequest>;
  byId(
    organizationId: OrganizationId,
    designId: DesignId,
    versionNumber: number,
    drapeId: DrapeId,
  ): Promise<Drape | undefined>;
  /** Enregistre le résultat du moteur si (et seulement si) le drapé est encore en attente (atomique). */
  recordOutcome(
    location: DrapeLocation,
    outcome: DrapeOutcome,
    now: Date,
  ): Promise<RecordedOutcome>;
}
