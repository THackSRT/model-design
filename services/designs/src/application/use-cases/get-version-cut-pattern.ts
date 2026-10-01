import type { CutPattern } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import type { DesignRepository } from '../ports/design-repository.js';
import type {
  CutPatternOptionsInput,
  ManufacturingEngine,
  ManufacturingFailure,
} from '../ports/manufacturing-engine.js';
import { findVersion } from './find-version.js';
import type { NotFound } from './get-design.js';

export const getVersionCutPattern =
  (deps: { designs: DesignRepository; manufacturing: ManufacturingEngine }) =>
  async (
    input: {
      organizationId: OrganizationId;
      designId: DesignId;
      number: number;
    } & CutPatternOptionsInput,
  ): Promise<Result<CutPattern, NotFound | ManufacturingFailure>> => {
    const version = await findVersion(deps.designs, input);
    if (version.isErr()) return err(version.error);
    const pattern = await deps.manufacturing.cutPattern(version.value.spec, {
      finishing: input.finishing,
      sizeLabel: input.sizeLabel,
    });
    return pattern.isOk() ? ok(pattern.value) : err(pattern.error);
  };
