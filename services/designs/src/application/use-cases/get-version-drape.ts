import { type Clock, err, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import { type Drape, type DrapeId, readAt } from '../../domain/drape.js';
import type { DrapeRepository } from '../ports/drape-repository.js';

export interface GetVersionDrapeInput {
  organizationId: OrganizationId;
  designId: DesignId;
  number: number;
  drapeId: DrapeId;
}

/** État d'un drapé de l'organisation ; en attente depuis 10 minutes, il se lit échoué (drape-timeout). */
export const getVersionDrape =
  (deps: { drapes: DrapeRepository; clock: Clock }) =>
  async (input: GetVersionDrapeInput): Promise<Result<Drape, { kind: 'drape-not-found' }>> => {
    const drape = await deps.drapes.byId(
      input.organizationId,
      input.designId,
      input.number,
      input.drapeId,
    );
    return drape ? ok(readAt(drape, deps.clock.now())) : err({ kind: 'drape-not-found' });
  };
