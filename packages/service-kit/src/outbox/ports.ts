import type { CloudEventEnvelope } from '@atelier/contracts-ts';

/** Ligne de l'outbox : un événement du domaine écrit dans la même transaction que l'état. */
export interface OutboxRow {
  readonly id: string;
  readonly type: string;
  readonly subject: string;
  readonly data: object;
  readonly createdAt: Date;
}

/** Port de l'outbox d'un service (l'adaptateur PostgreSQL vit dans chaque service). */
export interface OutboxStore {
  /** Lignes non publiées, de la plus ancienne (`created_at`) à la plus récente. */
  fetchUnpublished(limit: number): Promise<readonly OutboxRow[]>;
  markPublished(ids: readonly string[], at: Date): Promise<void>;
}

/** Port du bus : rend la main seulement quand le bus a accusé réception. */
export interface EventPublisher {
  publish(event: CloudEventEnvelope): Promise<void>;
}
