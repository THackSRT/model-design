#!/bin/sh
# Exécuté une seule fois, à la création du volume PostgreSQL (docker-entrypoint-initdb.d).
# Crée le rôle de service de `designs` : sans privilège, propriétaire d'aucune table. Les droits sur les
# tables viennent de la migration 0003 du service, qui tourne sous le propriétaire (`atelier`).
# Volume déjà créé : `pnpm stack:down` puis `docker compose -f platform/docker-compose.yml down -v`, ou lancer
# ce script à la main avec psql.
set -eu
psql -v ON_ERROR_STOP=1 -v pw="$DESIGNS_APP_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
create role designs_app login nosuperuser nobypassrls nocreatedb nocreaterole noinherit password :'pw';
SQL
