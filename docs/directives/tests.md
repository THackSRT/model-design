# 9. Tests

La plupart des tests portent sur le domaine et les cas d'usage, qui se testent en millisecondes sans base ni
réseau ; les tests lents ne couvrent que ce que les rapides ne peuvent pas voir. Pour un agent, les tests sont la
spécification exécutable : une tâche est finie quand ses tests existent et passent.

| Niveau             | Vérifie                                                              | Outils                                          | Où aujourd'hui                                                |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Unitaires          | Domaine et cas d'usage, ports remplacés par des doublures en mémoire | Vitest, pytest                                  | `services/designs/test/unit`, `engines/patterning/tests/unit` |
| Propriétés         | Invariants sur des entrées tirées au hasard                          | Hypothesis (fast-check à venir)                 | `engines/patterning/tests/property`                           |
| Référence (golden) | Sorties des moteurs sur les modèles de référence                     | pytest                                          | `engines/patterning/tests/golden`                             |
| Intégration        | Adaptateurs contre un vrai PostgreSQL                                | PGlite (PostgreSQL en WebAssembly, sans Docker) | `services/designs/test/integration`                           |
| Contrat            | Réponses validées contre les schémas des contrats                    | `contractValidator`                             | `services/designs/test/http`                                  |
| Composants et vues | Rendu de chaque état, interactions                                   | Testing Library (Storybook à venir)             | `apps/studio/test`, `packages/ui-web`                         |
| Bout en bout       | Parcours critiques dans un vrai navigateur                           | Playwright _(à venir)_                          | —                                                             |
| Charge             | Temps de réponse et débit visés                                      | k6 _(à venir)_                                  | —                                                             |

- **Couverture** : viser au moins 90 % des lignes de `domain/` et `application/` ; pas d'objectif chiffré pour
  les vues, mais un test par état.
- **Doublures** : implémentations en mémoire des ports (`InMemoryDesignRepository`, `FakePatterningEngine`)
  plutôt que des simulations appel par appel, fragiles au moindre refactoring.
- **Données** : constructeurs lisibles (`aDesign()`, `someMeasurements()`) et données synthétiques ; jamais de
  données réelles de client.
- **Déterminisme** : horloge et générateur d'identifiants injectés (`fixedClock`, `sequentialIds`), graines
  fixées, aucune attente arbitraire ; un test instable est un bogue à corriger, pas à relancer.
- **Bogues** : on écrit d'abord le test qui reproduit le bogue, on le voit échouer, puis on corrige.
- **Nommage** : le nom d'un test décrit un comportement (« refuse un patron d'un autre type de vêtement »).
