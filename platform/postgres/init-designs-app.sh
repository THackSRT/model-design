#!/bin/sh
# Exécuté une seule fois, à la création du volume PostgreSQL (docker-entrypoint-initdb.d).
# Crée le rôle de service de `designs` : sans privilège, propriétaire d'aucune table. Les droits sur les
# tables viennent de la migration 0003 du service, qui tourne sous le propriétaire (`atelier`).
# Volume déjà créé (ce script ne rejoue pas ; créer le rôle seul ne suffit pas : designs a déjà enregistré 0003
# sans effet et ne la rejoue pas, d'où « permission denied »). Deux voies :
#   1. recréer le volume : `docker compose -f platform/docker-compose.yml down -v` (données de développement perdues) ;
#   2. créer le rôle (la commande `create role` ci-dessous, mot de passe de développement du compose), puis jouer
#      `psql -f services/designs/migrations/0003_service_role_grants.sql` sous le propriétaire `atelier`, base `designs`.
set -eu
psql -v ON_ERROR_STOP=1 -v pw="$DESIGNS_APP_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
create role designs_app login nosuperuser nobypassrls nocreatedb nocreaterole noinherit password :'pw';
SQL
