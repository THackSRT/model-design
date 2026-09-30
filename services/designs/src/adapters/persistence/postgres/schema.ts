import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Reflet des migrations SQL (migrations/*.sql), qui font foi.
export const designs = pgTable('designs', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  garmentType: text('garment_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  latestVersionNumber: integer('latest_version_number').notNull(),
});

export const designVersions = pgTable(
  'design_versions',
  {
    designId: uuid('design_id').notNull(),
    organizationId: uuid('organization_id').notNull(),
    number: integer('number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    measurements: jsonb('measurements').$type<MeasurementSet>().notNull(),
    garment: jsonb('garment').$type<GarmentRequest>().notNull(),
    fingerprint: text('fingerprint').notNull(),
    spec: jsonb('spec').$type<GarmentSpec>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.designId, t.number] })],
);

export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey(),
  type: text('type').notNull(),
  subject: text('subject').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});
