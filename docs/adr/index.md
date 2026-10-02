# Décisions (ADR)

Une décision d'architecture, une nouvelle dépendance ou une exception aux règles = une fiche courte,
numérotée, jamais réécrite (une décision remplacée reçoit une nouvelle fiche qui la cite).

Format : **Contexte** (ce qui oblige à décider), **Décision**, **Conséquences** (ce que cela coûte et impose).

| N°                                            | Décision                                                                   | Statut               |
| --------------------------------------------- | -------------------------------------------------------------------------- | -------------------- |
| [0001](0001-microservices-monorepo.md)        | Microservices dès le départ, dans un seul dépôt                            | Acceptée             |
| [0002](0002-contrats-d-abord.md)              | Contrats d'abord : JSON Schema, OpenAPI, AsyncAPI, code généré             | Acceptée             |
| [0003](0003-pile-technique.md)                | Pile technique et outillage                                                | Acceptée             |
| [0004](0004-reprise-moteur-mannequin.md)      | Reprise du moteur mannequin du prototype (exception aux limites de taille) | Close (1.12)         |
| [0005](0005-organisation-de-developpement.md) | Organisation fixe tant que le service Identité n'existe pas                | Acceptée, temporaire |
| [0006](0006-local-d-abord.md)                 | Local d'abord, zéro dépense                                                | Acceptée             |
| [0007](0007-orchestration-des-modeles.md)     | Orchestration des agents : Opus décide, Sonnet construit, Haiku exécute    | Acceptée             |
| [0008](0008-client-nats.md)                   | Client NATS : `@nats-io/jetstream` et `@nats-io/transport-node`            | Acceptée             |
| [0009](0009-moteur-de-fabrication.md)         | Moteur de fabrication : géométrie et exports écrits par le moteur          | Acceptée             |
| [0010](0010-integration-garmentcode.md)       | Intégration de GarmentCode : tracés réécrits en Python pur                 | Acceptée             |
| [0011](0011-messages-icu.md)                  | Messages ICU : `intl-messageformat` (FormatJS)                             | Acceptée             |
| [0012](0012-fabrication-via-designs.md)       | Pièces de coupe et exports servis par `designs`                            | Acceptée             |
| [0013](0013-drape-physique.md)                | Drapé physique en TypeScript (XPBD, CPU), en tâche NATS                    | Acceptée             |
| [0014](0014-versions-et-erreurs-relayees.md)  | Versions d'un modèle et erreurs du patronage relayées                      | Acceptée             |
| [0015](0015-banc-d-essai-des-tissus.md)       | Banc d'essai des tissus : préréglages validés par un modéliste, rapport    | Acceptée             |
| [0016](0016-storybook-et-captures.md)         | Storybook et captures comparées (Vitest navigateur, Chromium dans Docker)  | Acceptée             |
| [0017](0017-tests-de-bout-en-bout.md)         | Tests de bout en bout : Playwright sur la pile Docker, hors `pnpm check`   | Acceptée             |
