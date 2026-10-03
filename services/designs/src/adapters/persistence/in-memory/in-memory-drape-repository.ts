import type { DomainEvent } from '@atelier/kernel';
import type {
  DrapeLocation,
  DrapeRepository,
  RecordedOutcome,
  SavedDrapeRequest,
} from '../../../application/ports/drape-repository.js';
import type { DesignId, OrganizationId } from '../../../domain/design.js';
import {
  type Drape,
  type DrapeId,
  type DrapeOutcome,
  type DrapeRequested,
  isReusable,
  settle,
} from '../../../domain/drape.js';

/** Dépôt de drapés en mémoire : développement local sans base, et doublure des tests. */
export class InMemoryDrapeRepository implements DrapeRepository {
  private readonly drapes = new Map<string, Drape>();
  readonly outbox: DomainEvent[] = [];

  async saveRequest({ drape, events }: DrapeRequested, now: Date): Promise<SavedDrapeRequest> {
    const existing = [...this.drapes.values()]
      .filter(
        (d) =>
          d.organizationId === drape.organizationId &&
          d.designId === drape.designId &&
          d.versionNumber === drape.versionNumber &&
          d.requestFingerprint === drape.requestFingerprint &&
          isReusable(d, now),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (existing) return { drape: existing, created: false };
    this.drapes.set(drape.id, drape);
    this.outbox.push(...events);
    return { drape, created: true };
  }

  async byId(
    organizationId: OrganizationId,
    designId: DesignId,
    versionNumber: number,
    drapeId: DrapeId,
  ): Promise<Drape | undefined> {
    const drape = this.drapes.get(drapeId);
    const visible =
      drape?.organizationId === organizationId &&
      drape.designId === designId &&
      drape.versionNumber === versionNumber;
    return visible ? drape : undefined;
  }

  async recordOutcome(
    location: DrapeLocation,
    outcome: DrapeOutcome,
    now: Date,
  ): Promise<RecordedOutcome> {
    const drape = await this.byId(
      location.organizationId,
      location.designId,
      location.versionNumber,
      location.drapeId,
    );
    if (!drape) return 'unknown';
    const settled = settle(drape, outcome, now);
    if (!settled) return 'already-settled';
    this.drapes.set(settled.id, settled);
    return 'applied';
  }
}
