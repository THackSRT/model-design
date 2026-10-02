import type { Clock, IdGenerator } from '@atelier/kernel';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { DesignRepository } from '../../../application/ports/design-repository.js';
import type { Design, DesignId, GarmentType, OrganizationId } from '../../../domain/design.js';
import type {
  DesignVersion,
  VersionAdded,
  VersionSummary,
} from '../../../domain/design-version.js';
import type { Database } from './database.js';
import { designs, designVersions, outbox } from './schema.js';

type DesignRow = typeof designs.$inferSelect;
type VersionRow = typeof designVersions.$inferSelect;

const toDesign = (row: DesignRow): Design => ({
  id: row.id as DesignId,
  organizationId: row.organizationId as OrganizationId,
  name: row.name,
  garmentType: row.garmentType as GarmentType,
  createdAt: row.createdAt,
  latestVersionNumber: row.latestVersionNumber,
});

const toVersion = (row: VersionRow): DesignVersion => ({
  designId: row.designId as DesignId,
  number: row.number,
  createdAt: row.createdAt,
  measurements: row.measurements,
  garment: row.garment,
  fingerprint: row.fingerprint,
  spec: row.spec,
});

export class PostgresDesignRepository implements DesignRepository {
  constructor(
    private readonly db: Database,
    private readonly deps: { ids: IdGenerator; clock: Clock },
  ) {}

  async create(design: Design): Promise<void> {
    await this.db.insert(designs).values(design);
  }

  async byId(organizationId: OrganizationId, designId: DesignId): Promise<Design | undefined> {
    const rows = await this.db
      .select()
      .from(designs)
      .where(and(eq(designs.id, designId), eq(designs.organizationId, organizationId)));
    return rows[0] ? toDesign(rows[0]) : undefined;
  }

  async saveNewVersion({ design, version, events }: VersionAdded): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Contexte lu par les politiques de sécurité au niveau des lignes (migrations/0001).
      await tx.execute(
        sql`select set_config('app.organization_id', ${design.organizationId}, true)`,
      );
      await tx
        .update(designs)
        .set({ latestVersionNumber: design.latestVersionNumber })
        .where(eq(designs.id, design.id));
      await tx.insert(designVersions).values({ ...version, organizationId: design.organizationId });
      const now = this.deps.clock.now();
      await tx
        .insert(outbox)
        .values(events.map((e) => ({ ...e, id: this.deps.ids.next<'event'>(), createdAt: now })));
    });
  }

  async version(
    organizationId: OrganizationId,
    designId: DesignId,
    number: number,
  ): Promise<DesignVersion | undefined> {
    const rows = await this.db
      .select()
      .from(designVersions)
      .where(
        and(
          eq(designVersions.designId, designId),
          eq(designVersions.organizationId, organizationId),
          eq(designVersions.number, number),
        ),
      );
    return rows[0] ? toVersion(rows[0]) : undefined;
  }

  async versionSummaries(
    organizationId: OrganizationId,
    designId: DesignId,
    page: { limit: number; before?: number },
  ): Promise<VersionSummary[]> {
    // Ni les mesures ni le patron entier ne sont lus : seulement de quoi faire un résumé.
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
      const rows = await tx
        .select({
          number: designVersions.number,
          createdAt: designVersions.createdAt,
          fingerprint: designVersions.fingerprint,
          garment: designVersions.garment,
          engineVersion: sql<string>`${designVersions.spec}->'engine'->>'version'`,
        })
        .from(designVersions)
        .where(
          and(
            eq(designVersions.designId, designId),
            eq(designVersions.organizationId, organizationId),
            page.before === undefined ? undefined : lt(designVersions.number, page.before),
          ),
        )
        .orderBy(desc(designVersions.number))
        .limit(page.limit);
      return rows;
    });
  }
}
