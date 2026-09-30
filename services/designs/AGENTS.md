# Service designs (service de référence)

Rôle : modèles, versions de modèle et spécifications de patron. Données possédées : tables `designs`,
`design_versions`, `outbox`. Événement publié : `design.versioned`. Appelle : moteur `patterning` (HTTP, 2 s).

- `src/domain` : `Design`, `DesignVersion`, `addVersion` (invariants, événement), `canonicalJson` (empreinte).
- `src/application` : un fichier par cas d'usage ; ports `DesignRepository`, `PatterningEngine`, `Hasher`.
- `src/adapters` : `http/` (NestJS, validation par contrat, erreurs RFC 9457), `persistence/in-memory` et
  `persistence/postgres` (Drizzle, `migrate.ts`), `engines/` (client du moteur), `platform/`.
- `src/composition.ts` : configuration (zod) et câblage ; `src/main.ts` : démarrage.
- `migrations/*.sql` font foi ; `adapters/persistence/postgres/schema.ts` en est le reflet.
- Tests : `test/unit` (domaine, cas d'usage avec doublures), `test/integration` (PostgreSQL réel via PGlite),
  `test/http` (API de bout en bout, réponses validées contre les contrats).
- Organisation : fixe en phase 1 (`DEV_ORGANIZATION_ID`, ADR 0005).
- Commandes : `pnpm nx run @atelier/designs:test|lint|typecheck|build`, `pnpm --filter @atelier/designs start`.
