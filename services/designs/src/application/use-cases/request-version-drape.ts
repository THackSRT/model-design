import type { DrapeRequest } from '@atelier/contracts-ts';
import { type Clock, err, type IdGenerator, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import {
  type Drape,
  normalizeRequest,
  readAt,
  requestCanonical,
  requestDrape,
} from '../../domain/drape.js';
import type { DesignRepository } from '../ports/design-repository.js';
import type { DrapeRepository } from '../ports/drape-repository.js';
import type { Hasher } from '../ports/hasher.js';
import { findVersion } from './find-version.js';
import type { NotFound } from './get-design.js';

export interface RequestVersionDrapeInput {
  organizationId: OrganizationId;
  designId: DesignId;
  number: number;
  request: DrapeRequest;
}

export interface RequestedDrape {
  drape: Drape;
  /** Faux : la même demande existait déjà (200 au lieu de 202). */
  created: boolean;
}

export interface RequestVersionDrapeDeps {
  designs: DesignRepository;
  drapes: DrapeRepository;
  hasher: Hasher;
  ids: IdGenerator;
  clock: Clock;
}

/** Demande le drapé d'une version : idempotent par empreinte de la demande canonique. */
export const requestVersionDrape =
  (deps: RequestVersionDrapeDeps) =>
  async (input: RequestVersionDrapeInput): Promise<Result<RequestedDrape, NotFound>> => {
    const version = await findVersion(deps.designs, input);
    if (version.isErr()) return err(version.error);
    const request = normalizeRequest(input.request);
    const now = deps.clock.now();
    const change = requestDrape({
      id: deps.ids.next<'drape'>(),
      organizationId: input.organizationId,
      version: version.value,
      request,
      requestFingerprint: deps.hasher.sha256(requestCanonical(request)),
      now,
    });
    const saved = await deps.drapes.saveRequest(change, now);
    return ok({ drape: readAt(saved.drape, now), created: saved.created });
  };
