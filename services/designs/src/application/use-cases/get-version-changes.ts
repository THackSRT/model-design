import { ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import { summaryOf, type VersionSummary } from '../../domain/design-version.js';
import { compareVersions, type VersionChanges } from '../../domain/version-changes.js';
import type { DesignRepository } from '../ports/design-repository.js';
import { findVersion } from './find-version.js';
import type { NotFound } from './get-design.js';

export interface VersionComparison extends VersionChanges {
  from: VersionSummary;
  to: VersionSummary;
}

/** Différences d'entrées entre la version `since` (from) et la version `number` (to). */
export const getVersionChanges =
  (deps: { designs: DesignRepository }) =>
  async (input: {
    organizationId: OrganizationId;
    designId: DesignId;
    number: number;
    since: number;
  }): Promise<Result<VersionComparison, NotFound>> => {
    const scope = { organizationId: input.organizationId, designId: input.designId };
    const to = await findVersion(deps.designs, { ...scope, number: input.number });
    if (to.isErr()) return to;
    const from = await findVersion(deps.designs, { ...scope, number: input.since });
    if (from.isErr()) return from;
    return ok({
      ...compareVersions(from.value, to.value),
      from: summaryOf(from.value),
      to: summaryOf(to.value),
    });
  };
