# 0008 — Client NATS : `@nats-io/jetstream` et `@nats-io/transport-node`

**Contexte.** L'ADR 0003 retient NATS JetStream comme bus. Le relais de l'outbox (`@atelier/service-kit`) doit
publier sur ce bus avec accusé de réception et déduplication. Il faut choisir le client Node.js.

**Décision.** Utiliser la distribution officielle actuelle de nats.js (v3) : `@nats-io/jetstream` (publication
JetStream, gestion des flux) et `@nats-io/transport-node` (connexion TCP), en version `^3.4.0`. Le paquet `nats`
(2.x) est l'ancienne distribution monolithique, conservée pour compatibilité : on ne la prend pas. Licence des
deux paquets : Apache 2.0 (permise). Les dépendances transitives de l'organisation (`@nats-io/nats-core`,
`nkeys`, `nuid`) sont sous Apache 2.0, sauf `tweetnacl` 1.x (tirée par `@nats-io/nkeys`, commune à tous les
clients JavaScript de NATS), sous **Unlicense** : dédicace au domaine public, approuvée par l'OSI, sans
obligation. **L'Unlicense rejoint la liste des licences permises** (`AGENTS.md`, directives de conventions).
Le client n'est utilisé que dans `@atelier/service-kit/nats`
(adaptateur `JetStreamPublisher`) ; le domaine et le relais ne voient que le port `EventPublisher`.

**Conséquences.** Le sujet NATS est le `type` de l'événement (adresse du canal AsyncAPI, ex. `design.versioned`) ;
l'en-tête `Nats-Msg-Id` porte l'id CloudEvents pour la déduplication par JetStream (fenêtre de 2 minutes par
défaut : les consommateurs restent idempotents, garantie « au moins une fois »). Les tests d'intégration
demandent un NATS avec JetStream (`pnpm dev:infra`) et sont hors de `pnpm check`. Un changement de client passe
par une nouvelle ADR.
