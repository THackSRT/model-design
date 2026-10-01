import type { DomainEvent } from '@atelier/kernel';
import type { DesignRepository } from '../../../application/ports/design-repository.js';
import type { Design, DesignId, OrganizationId } from '../../../domain/design.js';
import {
  summaryOf,
  type DesignVersion,
  type VersionAdded,
  type VersionSummary,
} from '../../../domain/design-version.js';

/** Dépôt en mémoire : développement local sans base, et doublure des tests. */
export class InMemoryDesignRepository implements DesignRepository {
  private readonly designs = new Map<string, Design>();
  private readonly versions = new Map<string, DesignVersion>();
  readonly outbox: DomainEvent[] = [];

  async create(design: Design): Promise<void> {
    this.designs.set(design.id, design);
  }

  async byId(organizationId: OrganizationId, designId: DesignId): Promise<Design | undefined> {
    const design = this.designs.get(designId);
    return design?.organizationId === organizationId ? design : undefined;
  }

  async saveNewVersion(change: VersionAdded): Promise<void> {
    this.designs.set(change.design.id, change.design);
    this.versions.set(`${change.version.designId}#${change.version.number}`, change.version);
    this.outbox.push(...change.events);
  }

  async version(
    organizationId: OrganizationId,
    designId: DesignId,
    number: number,
  ): Promise<DesignVersion | undefined> {
    if (!(await this.byId(organizationId, designId))) return undefined;
    return this.versions.get(`${designId}#${number}`);
  }

  async versionSummaries(
    organizationId: OrganizationId,
    designId: DesignId,
    page: { limit: number; before?: number },
  ): Promise<VersionSummary[]> {
    if (!(await this.byId(organizationId, designId))) return [];
    const before = page.before ?? Number.POSITIVE_INFINITY;
    return [...this.versions.values()]
      .filter((v) => v.designId === designId && v.number < before)
      .sort((a, b) => b.number - a.number)
      .slice(0, page.limit)
      .map(summaryOf);
  }
}
