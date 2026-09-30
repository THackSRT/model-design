import { err, ok, type Result } from '@atelier/kernel';
import type { Design, DesignId, OrganizationId } from '../../domain/design.js';
import type { DesignVersion } from '../../domain/design-version.js';
import type { DesignRepository } from '../ports/design-repository.js';

export type NotFound = { kind: 'design-not-found' } | { kind: 'version-not-found' };

export const getDesign =
  (deps: { designs: DesignRepository }) =>
  async (input: {
    organizationId: OrganizationId;
    designId: DesignId;
  }): Promise<Result<Design, NotFound>> => {
    const design = await deps.designs.byId(input.organizationId, input.designId);
    return design ? ok(design) : err({ kind: 'design-not-found' });
  };

export const getDesignVersion =
  (deps: { designs: DesignRepository }) =>
  async (input: {
    organizationId: OrganizationId;
    designId: DesignId;
    number: number;
  }): Promise<Result<DesignVersion, NotFound>> => {
    const version = await deps.designs.version(input.organizationId, input.designId, input.number);
    return version ? ok(version) : err({ kind: 'version-not-found' });
  };
