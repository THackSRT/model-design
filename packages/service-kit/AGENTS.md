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
(ex. `design.versioned`) ; le flux JetStream est créé par l'infrastructure, pas par le relais. L'adaptateur
PostgreSQL d'`OutboxStore` vit dans chaque service. Client : ADR 0008. Un `runOnce()` appelé à la main pendant que la boucle tourne peut publier deux fois ; la
déduplication JetStream (fenêtre du flux) le couvre, les consommateurs restent idempotents.

Tests unitaires (hermétiques) : `pnpm nx run @atelier/service-kit:test`. Tests d'intégration contre un vrai NATS
(`*.integration.test.ts`, hors de `pnpm check`) :

```bash
pnpm dev:infra
pnpm nx run @atelier/service-kit:test:integration   # NATS_URL, défaut nats://localhost:4222
```
