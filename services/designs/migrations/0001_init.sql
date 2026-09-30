-- Service designs : modèles, versions et boîte d'envoi des événements (outbox).
create table designs (
  id uuid primary key,
  organization_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  garment_type text not null,
  created_at timestamptz not null,
  latest_version_number integer not null default 0 check (latest_version_number >= 0)
);
--> statement-breakpoint
create index designs_organization on designs (organization_id);
--> statement-breakpoint
create table design_versions (
  design_id uuid not null references designs (id),
  organization_id uuid not null,
  number integer not null check (number >= 1),
  created_at timestamptz not null,
  measurements jsonb not null,
  garment jsonb not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  spec jsonb not null,
  primary key (design_id, number)
);
--> statement-breakpoint
create table outbox (
  id uuid primary key,
  type text not null,
  subject text not null,
  data jsonb not null,
  created_at timestamptz not null,
  published_at timestamptz
);
--> statement-breakpoint
create index outbox_unpublished on outbox (created_at) where published_at is null;
--> statement-breakpoint
-- Isolation par organisation : le compte du service (non propriétaire) ne voit que les lignes de
-- l'organisation fixée par la transaction (set_config('app.organization_id', …)).
alter table designs enable row level security;
--> statement-breakpoint
create policy designs_by_organization on designs
  using (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
alter table design_versions enable row level security;
--> statement-breakpoint
create policy design_versions_by_organization on design_versions
  using (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
