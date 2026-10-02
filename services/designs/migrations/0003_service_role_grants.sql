-- Droits du rôle de service `designs_app` (tâche 1.44) : le service ne possède aucune table, ne crée rien et
-- reste soumis à la sécurité par lignes. Le rôle est créé hors migration (platform/postgres/init-designs-app.sh,
-- mot de passe propre à l'environnement) ; sans lui cette migration ne fait rien. Rejouable : les GRANT sont idempotents.
-- Retour arrière : revoke all on all tables in schema public from designs_app;
--   alter default privileges in schema public revoke select, insert, update on tables from designs_app;
-- Pas de DELETE : le code n'en émet aucun. Tables futures : ALTER DEFAULT PRIVILEGES vaut pour les tables créées
-- ensuite par le rôle qui migre ; une migration qui ajoute une table n'a donc rien à accorder (DELETE à ajouter
-- explicitement si un cas d'usage en a besoin).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'designs_app') then
    grant usage on schema public to designs_app;
    grant select, insert, update on all tables in schema public to designs_app;
    grant usage, select on all sequences in schema public to designs_app;
    alter default privileges in schema public grant select, insert, update on tables to designs_app;
    alter default privileges in schema public grant usage, select on sequences to designs_app;
    revoke all on schema_migrations from designs_app;
  end if;
end
$$;
