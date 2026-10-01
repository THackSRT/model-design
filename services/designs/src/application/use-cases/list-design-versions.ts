import { err, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import type { VersionSummary } from '../../domain/design-version.js';
import type { DesignRepository } from '../ports/design-repository.js';

export interface VersionPage {
  items: VersionSummary[];
  /** Numéro avant lequel reprendre ; absent s'il ne reste pas de version plus ancienne. */
  nextBefore?: number;
}

/** Page de résumés de versions, la plus récente d'abord. */
export const listDesignVersions =
  (deps: { designs: DesignRepository }) =>
  async (input: {
    organizationId: OrganizationId;
    designId: DesignId;
    limit: number;
    before?: number;
  }): Promise<Result<VersionPage, { kind: 'design-not-found' }>> => {
    const design = await deps.designs.byId(input.organizationId, input.designId);
    if (!design) return err({ kind: 'design-not-found' });
    const items = await deps.designs.versionSummaries(input.organizationId, input.designId, {
      limit: input.limit,
      ...(input.before === undefined ? {} : { before: input.before }),
    });
    const last = items.at(-1);
    // Numéros denses (1..n) : il reste des versions plus anciennes tant que la dernière rendue est > 1.
    return ok(last && last.number > 1 ? { items, nextBefore: last.number } : { items });
  };
