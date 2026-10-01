# Service designs (service de référence)

Rôle : modèles, versions de modèle et spécifications de patron. Données possédées : tables `designs`,
`design_versions`, `outbox`. Événement publié : `design.versioned`. Appelle : moteurs `patterning` et `manufacturing` (HTTP, 2 s).

- `src/domain` : `Design`, `DesignVersion`, `addVersion` (invariants, événement), `canonicalJson` (empreinte).
- `src/application` : un fichier par cas d'usage ; ports `DesignRepository`, `PatterningEngine`, `Hasher`.
- `src/adapters` : `http/` (NestJS, validation par contrat, erreurs RFC 9457), `persistence/in-memory` et
  `persistence/postgres` (Drizzle, `migrate.ts`), `engines/` (client du moteur), `platform/`.
- `src/composition.ts` : configuration (zod) et câblage ; `src/main.ts` : démarrage.
- `migrations/*.sql` font foi ; `adapters/persistence/postgres/schema.ts` en est le reflet.
- Tests : `test/unit` (domaine, cas d'usage avec doublures), `test/integration` (PostgreSQL réel via PGlite),
  `test/http` (API de bout en bout, réponses validées contre les contrats).
- Organisation : fixe en phase 1 (`DEV_ORGANIZATION_ID`, ADR 0005).
- Relais de l'outbox : avec `NATS_URL` (et `DATABASE_URL`), `composition.ts` ouvre la connexion NATS
  (`adapters/messaging/nats-event-bus.ts`), déclare le flux `DESIGNS` (sujets `design.>`, stockage fichier,
  déduplication par défaut) via `ensureStream` de service-kit, puis démarre `createOutboxRelay`. Flux déjà présent :
  ses sujets sont alignés ; un écart que JetStream refuse (ex. stockage) est journalisé (`outbox-relay-failed`) et le relais ne démarre pas. Sans `NATS_URL`
  (ou sans base) : pas de relais. Variables : `NATS_URL` (`nats://nats:4222` dans la pile), `OUTBOX_INTERVAL_MS`
  (1000), `OUTBOX_BATCH_SIZE` (100). L'API HTTP ne dépend pas de NATS : si le bus est injoignable, le service démarre
  quand même et la connexion se fait en arrière-plan (`start-relay.ts`, tentatives journalisées `nats.waiting`, relais
  démarré une fois connecté) ; `close()` annule l'attente. Après une coupure, le client se reconnecte sans limite
  (`connectNats` de service-kit, seul point d'accès au client NATS, ADR 0008). `PostgresOutboxStore` lit toutes les organisations (la table `outbox` n'a pas de
  sécurité par lignes) par lots triés (`created_at`, `id`) ; aucun verrou entre lecture et marquage : la
  déduplication JetStream (`Nats-Msg-Id` = id de la ligne) couvre les doublons d'une seconde instance. Arrêt sur
  SIGTERM/SIGINT (`main.ts`) : HTTP, `relay.stop()`, `drain` NATS, fermeture de la base (pas de
  `enableShutdownHooks` de NestJS).
- Intégration avec NATS réel (hors `pnpm check`) : `pnpm dev:infra` puis
  `pnpm nx run @atelier/designs:test:integration` (`NATS_URL`, défaut `nats://localhost:4222`).
- Fabrication (ADR 0012) : `POST /v1/designs/{id}/versions/{n}/cut-patterns` (pièces de coupe) et `.../exports`
  (SVG, PDF A4 tuilé, DXF-AAMA) envoient la `spec` de la version au moteur `manufacturing`
  (`adapters/engines/http-manufacturing-engine.ts`, `requestBytes` de service-kit pour les fichiers). Variables :
  `MANUFACTURING_URL` (`http://localhost:3202`, `http://manufacturing:8000` dans la pile), `MANUFACTURING_TIMEOUT_MS`
  (2000) ; le service démarre sans le moteur. Types de problème du moteur relayés en 422 seulement s'ils sont dans
  la liste blanche (`MANUFACTURING_PROBLEM_TYPES`), tout le reste en 502 `engine-unavailable`. Type de contenu et
  nom de fichier sont fixés par le service (`domain/export-file-name.ts`), jamais recopiés du moteur. Pas de cache :
  réponses `Cache-Control: no-store` (données dérivées des mesures d'un client). Les exports sont demandés au moteur
  en français (`locale: 'fr'`, fixé dans l'adaptateur) tant que le studio n'a qu'une langue.
- Commandes : `pnpm nx run @atelier/designs:test|lint|typecheck|build`, `pnpm --filter @atelier/designs start`.
