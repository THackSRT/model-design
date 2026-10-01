import { err, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import type { DesignVersion } from '../../domain/design-version.js';
import type { DesignRepository } from '../ports/design-repository.js';
import type { NotFound } from './get-design.js';

/** Version d'un modèle de l'organisation : modèle absent et version absente sont distingués. */
export async function findVersion(
  designs: DesignRepository,
  input: { organizationId: OrganizationId; designId: DesignId; number: number },
): Promise<Result<DesignVersion, NotFound>> {
  if (!Number.isInteger(input.number) || input.number < 1) {
    return err({ kind: 'version-not-found' });
  }
  const design = await designs.byId(input.organizationId, input.designId);
  if (!design) return err({ kind: 'design-not-found' });
  const version = await designs.version(input.organizationId, input.designId, input.number);
  return version ? ok(version) : err({ kind: 'version-not-found' });
}
