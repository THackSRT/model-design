-- Drapés : tâches de drapé demandées pour une version de modèle (ADR 0013).
-- Retour arrière (l'exécuteur n'avance que) : drop table drapes;
-- request_fingerprint : SHA-256 de la demande canonique (tissu, avatar, finesse), jamais de mesure.
create table drapes (
  id uuid primary key,
  organization_id uuid not null,
  design_id uuid not null,
  version_number integer not null check (version_number >= 1),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('pending', 'completed', 'failed')),
  problem_type text,
  ease jsonb,
  max_strain_percent double precision,
  fabric_estimated boolean,
  model_key text,
  created_at timestamptz not null,
  completed_at timestamptz,
  foreign key (design_id, version_number) references design_versions (design_id, number)
);
--> statement-breakpoint
create index drapes_by_request on drapes (design_id, version_number, request_fingerprint, created_at);
--> statement-breakpoint
alter table drapes enable row level security;
--> statement-breakpoint
create policy drapes_by_organization on drapes
  using (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
