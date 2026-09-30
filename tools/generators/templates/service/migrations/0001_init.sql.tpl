-- Service __name__ : boîte d'envoi des événements (outbox). Ajoutez vos tables au-dessus.
create table outbox (
  id uuid primary key,
  type text not null,
  subject text not null,
  data jsonb not null,
  created_at timestamptz not null,
  published_at timestamptz
);
