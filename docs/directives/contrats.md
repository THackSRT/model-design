# 5. Contrats et communication entre services

Les contrats de `contracts/` sont la seule définition des échanges : on modifie le contrat, on régénère, puis on
code. `pnpm check` refuse un code généré qui ne correspond plus à son contrat ([ADR 0002](../adr/0002-contrats-d-abord.md)).

1. Modifier le contrat : un schéma de `contracts/schemas/` pour un corps de requête, de réponse ou d'événement ;
   `contracts/openapi/<service>.yaml` pour une route ; `contracts/asyncapi/events.yaml` pour un événement.
2. Régénérer : `pnpm contracts:gen` produit les types TypeScript (`packages/contracts-ts`) et les modèles
   Pydantic des moteurs (`py/contracts`). Les mêmes schémas servent à la validation à l'exécution : Ajv dans
   les services (`contractValidator`), Pydantic dans les moteurs, bornes lues dans les schémas côté front.
3. Implémenter côté producteur, puis côté consommateurs, chacun dans sa propre demande de fusion si possible.
4. Les tests vérifient que le producteur respecte le schéma (réponses validées dans les tests HTTP) et que chaque
   consommateur accepte les exemples du contrat.

Le client HTTP du front est écrit à la main sur les types générés (`packages/features/src/api`) : les types de
routes d'`openapi-typescript` rendent mal les schémas externes (ADR 0002).

## API REST

- OpenAPI 3.1, un fichier par service ; ressources au pluriel en kebab-case (`/purchase-orders`), version dans
  le chemin (`/v1`).
- Pagination par curseur ; erreurs au format RFC 9457 (`application/problem+json`) avec un `type` stable que le
  front traduit (`/problems/pattern-impossible`).
- Toute création qui engage de l'argent ou du stock exige un en-tête `Idempotency-Key` _(à venir, avec le
  premier service concerné)_.
- Chaque appel a un délai (`requestJson` de `service-kit`) ; les nouvelles tentatives sont faites par le
  maillage, jamais dans le code ([architecture 10.6](../architecture/inter-services.md)).
- Un service n'enchaîne pas plus de deux appels synchrones vers d'autres services : au-delà, on passe par un
  événement ou une copie locale des données.

## Événements

- Enveloppe CloudEvents 1.0 (`schemas/events/cloud-event.schema.json`), données décrites en JSON Schema et
  référencées dans AsyncAPI 3.
- Publication par la table outbox dans la même transaction que le changement d'état (en place dans `designs`) ;
  relais vers NATS JetStream dans `@atelier/service-kit` ([ADR 0008](../adr/0008-client-nats.md)). Livraison « au moins une fois », donc consommateurs idempotents.
- Un événement qui échoue plusieurs fois part dans une file des rejets, visible dans les tableaux de bord ;
  il n'est jamais ignoré en silence.
- Jamais de fichier lourd ni de donnée sensible dans un événement : identifiants et faits seulement.

## Tâches des moteurs

- Moteurs rapides (mannequin, patronage) : appel HTTP synchrone. Moteurs lourds (drapé, rendu, tissu numérique,
  IA, imbrication) : une tâche dans la file, puis un événement `<moteur>.completed` ou `<moteur>.failed`.
- Clé de cache d'un résultat = empreinte des entrées + version du moteur : mêmes entrées, même moteur, même
  résultat (voir l'empreinte des versions de `designs`).

## Compatibilité

| Changement de contrat                                                          | Dans la même version ?                                                                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Ajouter un champ optionnel, une route, un type d'événement                     | Oui                                                                                                            |
| Ajouter une valeur à une énumération                                           | Oui, si les consommateurs acceptent les valeurs inconnues                                                      |
| Rendre un champ obligatoire, renommer, supprimer, changer un type ou une unité | Non : nouvelle version (`/v2`, `order.created.v2`) publiée en parallèle jusqu'à la migration des consommateurs |

La vérification automatique des ruptures (oasdiff) est _à venir_.
