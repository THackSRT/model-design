import { type Clock, type IdGenerator, ok, type Result } from '@atelier/kernel';
import {
  createDesign as newDesign,
  type Design,
  type DesignError,
  type GarmentType,
  type OrganizationId,
} from '../../domain/design.js';
import type { DesignRepository } from '../ports/design-repository.js';

export interface CreateDesignInput {
  organizationId: OrganizationId;
  name: string;
  garmentType: GarmentType;
}

export const createDesign =
  (deps: { designs: DesignRepository; ids: IdGenerator; clock: Clock }) =>
  async (input: CreateDesignInput): Promise<Result<Design, DesignError>> => {
    const created = newDesign({ ...input, id: deps.ids.next<'design'>(), now: deps.clock.now() });
    if (created.isErr()) return created;
    await deps.designs.create(created.value);
    return ok(created.value);
  };
