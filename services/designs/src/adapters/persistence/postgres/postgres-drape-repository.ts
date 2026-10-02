import { and, desc, eq, sql } from 'drizzle-orm';
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
} from '../../../domain/drape.js';
import type { Database } from './database.js';
import { inOrganization } from './organization-scope.js';
import { drapes, outbox } from './schema.js';
import type { Clock, IdGenerator } from '@atelier/kernel';

type DrapeRow = typeof drapes.$inferSelect;

const toDrape = (row: DrapeRow): Drape => ({
  id: row.id as DrapeId,
  organizationId: row.organizationId as OrganizationId,
  designId: row.designId as DesignId,
  versionNumber: row.versionNumber,
  requestFingerprint: row.requestFingerprint,
  status: row.status,
  createdAt: row.createdAt,
  ...(row.problemType === null ? {} : { problemType: row.problemType }),
  ...(row.ease === null ? {} : { ease: row.ease }),
  ...(row.maxStrainPercent === null ? {} : { maxStrainPercent: row.maxStrainPercent }),
  ...(row.fabricEstimated === null ? {} : { fabricEstimated: row.fabricEstimated }),
  ...(row.modelKey === null ? {} : { modelKey: row.modelKey }),
  ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
});

const outcomeColumns = (outcome: DrapeOutcome, now: Date): Partial<DrapeRow> =>
  outcome.kind === 'completed'
    ? {
        status: 'completed',
        modelKey: outcome.result.modelKey,
        ease: outcome.result.ease,
        maxStrainPercent: outcome.result.maxStrainPercent,
        fabricEstimated: outcome.result.fabricEstimated,
        completedAt: now,
      }
    : { status: 'failed', problemType: outcome.problemType, completedAt: now };

export class PostgresDrapeRepository implements DrapeRepository {
  constructor(
    private readonly db: Database,
    private readonly deps: { ids: IdGenerator; clock: Clock },
  ) {}

  async saveRequest({ drape, events }: DrapeRequested, now: Date): Promise<SavedDrapeRequest> {
    return inOrganization(this.db, drape.organizationId, async (tx) => {
      // Deux demandes identiques simultanées s'attendent : la seconde trouve le drapé de la première.
      const key = `${drape.designId}#${drape.versionNumber}#${drape.requestFingerprint}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      const rows = await tx
        .select()
        .from(drapes)
        .where(
          and(
            eq(drapes.organizationId, drape.organizationId),
            eq(drapes.designId, drape.designId),
            eq(drapes.versionNumber, drape.versionNumber),
            eq(drapes.requestFingerprint, drape.requestFingerprint),
          ),
        )
        .orderBy(desc(drapes.createdAt));
      const existing = rows.map(toDrape).find((d) => isReusable(d, now));
      if (existing) return { drape: existing, created: false };
      await tx.insert(drapes).values({
        id: drape.id,
        organizationId: drape.organizationId,
        designId: drape.designId,
        versionNumber: drape.versionNumber,
        requestFingerprint: drape.requestFingerprint,
        status: drape.status,
        createdAt: drape.createdAt,
      });
      const createdAt = this.deps.clock.now();
      await tx
        .insert(outbox)
        .values(events.map((e) => ({ ...e, id: this.deps.ids.next<'event'>(), createdAt })));
      return { drape, created: true };
    });
  }

  async byId(
    organizationId: OrganizationId,
    designId: DesignId,
    versionNumber: number,
    drapeId: DrapeId,
  ): Promise<Drape | undefined> {
    return inOrganization(this.db, organizationId, async (tx) => {
      const rows = await tx
        .select()
        .from(drapes)
        .where(
          and(
            eq(drapes.id, drapeId),
            eq(drapes.organizationId, organizationId),
            eq(drapes.designId, designId),
            eq(drapes.versionNumber, versionNumber),
          ),
        );
      return rows[0] ? toDrape(rows[0]) : undefined;
    });
  }

  async recordOutcome(
    location: DrapeLocation,
    outcome: DrapeOutcome,
    now: Date,
  ): Promise<RecordedOutcome> {
    return inOrganization(this.db, location.organizationId, async (tx) => {
      const target = and(
        eq(drapes.id, location.drapeId),
        eq(drapes.organizationId, location.organizationId),
        eq(drapes.designId, location.designId),
        eq(drapes.versionNumber, location.versionNumber),
      );
      // Conditionnelle : deux résultats simultanés ne peuvent pas tous deux gagner (premier résultat gagne).
      const updated = await tx
        .update(drapes)
        .set(outcomeColumns(outcome, now))
        .where(and(target, eq(drapes.status, 'pending')))
        .returning({ id: drapes.id });
      if (updated.length > 0) return 'applied';
      const found = await tx.select({ id: drapes.id }).from(drapes).where(target);
      return found.length > 0 ? 'already-settled' : 'unknown';
    });
  }
}
