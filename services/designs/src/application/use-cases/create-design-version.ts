import type { GarmentRequest, MeasurementSet } from '@atelier/contracts-ts';
import { type Clock, err, ok, type Result } from '@atelier/kernel';
import type { DesignError, DesignId, OrganizationId } from '../../domain/design.js';
import { addVersion, type DesignVersion } from '../../domain/design-version.js';
import { canonicalJson } from '../../domain/fingerprint.js';
import type { DesignRepository } from '../ports/design-repository.js';
import type { Hasher } from '../ports/hasher.js';
import type { PatterningEngine, PatterningFailure } from '../ports/patterning-engine.js';

export interface CreateDesignVersionInput {
  organizationId: OrganizationId;
  designId: DesignId;
  measurements: MeasurementSet;
  garment: GarmentRequest;
}

export type CreateDesignVersionError =
  { kind: 'design-not-found' } | DesignError | PatterningFailure;

export interface CreateDesignVersionDeps {
  designs: DesignRepository;
  patterning: PatterningEngine;
  hasher: Hasher;
  clock: Clock;
}

export const createDesignVersion =
  (deps: CreateDesignVersionDeps) =>
  async (
    input: CreateDesignVersionInput,
  ): Promise<Result<DesignVersion, CreateDesignVersionError>> => {
    const design = await deps.designs.byId(input.organizationId, input.designId);
    if (!design) return err({ kind: 'design-not-found' });

    const spec = await deps.patterning.draft(input.measurements, input.garment);
    if (spec.isErr()) return spec;

    const fingerprint = deps.hasher.sha256(
      canonicalJson({
        measurements: input.measurements,
        garment: input.garment,
        engine: spec.value.engine,
      }),
    );
    const added = addVersion(design, {
      ...input,
      spec: spec.value,
      fingerprint,
      now: deps.clock.now(),
    });
    if (added.isErr()) return added;

    await deps.designs.saveNewVersion(added.value);
    return ok(added.value.version);
  };
