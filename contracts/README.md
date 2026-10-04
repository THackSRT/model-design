# Contrats

Source de vérité de tous les échanges. On modifie ici, puis `pnpm contracts:gen`, puis on code.

| Dossier                | Contenu                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `schemas/`             | JSON Schema 2020-12 des corps : mesures, demande et spécification de patron (`garment-spec`, format pivot en mm)  |
| `schemas/designs/`     | Corps des requêtes et réponses du service designs                                                                 |
| `schemas/events/`      | Enveloppe CloudEvents et données de chaque événement                                                              |
| `openapi/`             | Routes HTTP de chaque service ou moteur (OpenAPI 3.1), qui référencent `schemas/`                                 |
| `asyncapi/events.yaml` | Événements (AsyncAPI 3) : sujet NATS, producteur, consommateurs                                                   |
| `examples/`            | Exemples valides, un dossier par schéma (`garment-specs/` : GarmentSpec 1.1), vérifiés par `packages/service-kit` |

Règles de compatibilité : ajouter un champ optionnel, une route ou un événement ne casse rien ; rendre un
champ obligatoire, renommer, supprimer ou changer une unité demande une nouvelle version (`/v2`,
`order.created.v2`) publiée en parallèle. Un format qui porte sa version dans son contenu
(`GarmentSpec.specVersion`) monte de version mineure quand il s'élargit (1.0 → 1.1) ; ses lecteurs acceptent
toutes ses versions mineures. Un champ facultatif nouveau n'a pas de valeur par défaut dans le schéma : le code
Python généré l'écrirait sinon dans chaque sortie et changerait les références golden. Code généré :
`packages/contracts-ts/src/generated`, `py/contracts/src/atelier_contracts/generated` — jamais modifié à la main.
