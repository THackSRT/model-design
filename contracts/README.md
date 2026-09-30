# Contrats

Source de vérité de tous les échanges. On modifie ici, puis `pnpm contracts:gen`, puis on code.

| Dossier                | Contenu                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `schemas/`             | JSON Schema 2020-12 des corps : mesures, demande et spécification de patron (`garment-spec`, format pivot en mm) |
| `schemas/designs/`     | Corps des requêtes et réponses du service designs                                                                |
| `schemas/events/`      | Enveloppe CloudEvents et données de chaque événement                                                             |
| `openapi/`             | Routes HTTP de chaque service ou moteur (OpenAPI 3.1), qui référencent `schemas/`                                |
| `asyncapi/events.yaml` | Événements (AsyncAPI 3) : sujet NATS, producteur, consommateurs                                                  |

Règles de compatibilité : ajouter un champ optionnel, une route ou un événement ne casse rien ; rendre un
champ obligatoire, renommer, supprimer ou changer une unité demande une nouvelle version (`/v2`,
`order.created.v2`) publiée en parallèle. Code généré : `packages/contracts-ts/src/generated`,
`py/contracts/src/atelier_contracts/generated` — jamais modifié à la main.
