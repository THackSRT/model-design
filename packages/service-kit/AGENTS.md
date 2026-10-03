# Socle des microservices

Journaux JSON (`createLogger`, jamais de donnée sensible), configuration validée au démarrage (`loadConfig`),
validation par les schémas des contrats (`contractValidator`), erreurs RFC 9457 (`problem`,
`ProblemFilter` dans `@atelier/service-kit/nest`), client HTTP avec délai sans reprise (`requestJson` : les
reprises sont faites par le maillage), enveloppe CloudEvents (`toCloudEvent`). Ce paquet ne contient aucune règle métier.

## Relais de l'outbox

`createOutboxRelay({ store, publisher, clock, source, batchSize, logger })` lit les lignes non publiées
(`OutboxStore`), les publie en CloudEvents dans l'ordre de `created_at` (`EventPublisher`), puis les marque
publiées avec l'heure de l'horloge. `runOnce()` traite un lot ; `start(intervalMs)` / `await stop()` gèrent la
boucle. Garanties : au moins une fois ; `id` du CloudEvent = id de la ligne = `Nats-Msg-Id` (déduplication
JetStream) ; au premier échec le lot s'arrête, la ligne fautive et les suivantes restent non publiées ; journaux
avec id et type seulement. `JetStreamPublisher` (`@atelier/service-kit/nats`) publie sur le sujet égal au `type`
(ex. `design.versioned`) ; le flux est déclaré par le service producteur au démarrage avec `ensureStream(connection, { name, subjects, retention?, maxAgeMs? })` (idempotent : crée le flux en stockage fichier, ou aligne ses sujets ; `retention` `limits`/`workqueue`/`interest` et `maxAgeMs` sont facultatifs et, absents, ne sont pas fixés ; sur un flux existant l'âge maximal est mis à jour, une rétention différente fait échouer l'appel avec un message clair car JetStream ne la modifie pas ; échoue aussi si JetStream refuse la mise à jour), pas par le relais. `connectNats(url, name)` ouvre la connexion (reconnexion sans limite ; `@nats-io/transport-node` est une dépendance de service-kit, les services ne l'importent pas). `describeStream`, `lastStreamEvent` et `deleteStreamEvent` sont des aides d'inspection pour les tests d'intégration des services. L'adaptateur
PostgreSQL d'`OutboxStore` vit dans chaque service. Client : ADR 0008. Un `runOnce()` appelé à la main pendant que la boucle tourne peut publier deux fois ; la
déduplication JetStream (fenêtre du flux) le couvre, les consommateurs restent idempotents.

## Consommateur JetStream

`startJetStreamConsumer(connection, { stream, durable, filterSubjects, ackWaitMs?, maxDeliver?, retryDelayMs? }, handler, logger)` (`@atelier/service-kit/nats`) déclare le consommateur durable (acquittement explicite) et lit le flux un message à la fois en arrière-plan ; `stop()` arrête la lecture. Le `handler` reçoit `{ subject, data }` : résolu, le message est acquitté (aussi pour un message ignoré volontairement) ; rejeté, il est renvoyé après `retryDelayMs` (5 s) jusqu'à `maxDeliver` (5). Au moins une fois : traitements idempotents. Seuls le sujet et le nom de l'erreur sont journalisés, jamais le contenu. Le flux doit exister (`ensureStream`). Test hermétique de la boucle : `processMessages`.

Tests unitaires (hermétiques) : `pnpm nx run @atelier/service-kit:test`. Tests d'intégration contre un vrai NATS
(`*.integration.test.ts`, hors de `pnpm check`) :

```bash
pnpm dev:infra
pnpm nx run @atelier/service-kit:test:integration   # NATS_URL, défaut nats://localhost:4222
```
