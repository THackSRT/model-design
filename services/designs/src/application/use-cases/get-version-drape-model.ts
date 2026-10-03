import { type Clock, err, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import { type DrapeId, readAt } from '../../domain/drape.js';
import type { DrapeRepository } from '../ports/drape-repository.js';
import type { ObjectStore, StoredObject } from '../ports/object-store.js';

export interface GetVersionDrapeModelInput {
  organizationId: OrganizationId;
  designId: DesignId;
  number: number;
  drapeId: DrapeId;
}

export type DrapeModelError =
  { kind: 'drape-not-found' } | { kind: 'drape-not-completed' } | { kind: 'storage-unavailable' };

/**
 * Modèle 3D d'un drapé de l'organisation. La clé lue est celle enregistrée à la réception du résultat du moteur,
 * jamais une valeur fournie par l'appelant.
 */
export const getVersionDrapeModel =
  (deps: { drapes: DrapeRepository; models: ObjectStore; clock: Clock }) =>
  async (input: GetVersionDrapeModelInput): Promise<Result<StoredObject, DrapeModelError>> => {
    const stored = await deps.drapes.byId(
      input.organizationId,
      input.designId,
      input.number,
      input.drapeId,
    );
    if (!stored) return err({ kind: 'drape-not-found' });
    const drape = readAt(stored, deps.clock.now());
    if (drape.status !== 'completed' || drape.modelKey === undefined) {
      return err({ kind: 'drape-not-completed' });
    }
    const object = await deps.models.get(drape.modelKey);
    return object.isOk() ? ok(object.value) : err(object.error);
  };
