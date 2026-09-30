import type { OutboxRow, OutboxStore } from '@atelier/service-kit';
import { asc, inArray, isNull } from 'drizzle-orm';
import type { Database } from './database.js';
import { outbox } from './schema.js';

/**
 * Outbox PostgreSQL lue par le relais. La table `outbox` n'a pas de sécurité par lignes (migrations/0001) :
 * le relais voit les événements de toutes les organisations, c'est voulu. Aucun verrou entre la lecture et le
 * marquage : une seconde instance peut republier un lot, la déduplication JetStream (`Nats-Msg-Id` = id de la
 * ligne) absorbe le doublon.
 */
export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly db: Database) {}

  async fetchUnpublished(limit: number): Promise<readonly OutboxRow[]> {
    const rows = await this.db
      .select()
      .from(outbox)
      .where(isNull(outbox.publishedAt))
      .orderBy(asc(outbox.createdAt), asc(outbox.id))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      subject: r.subject,
      data: r.data as object,
      createdAt: r.createdAt,
    }));
  }

  async markPublished(ids: readonly string[], at: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(outbox)
      .set({ publishedAt: at })
      .where(inArray(outbox.id, [...ids]));
  }
}
