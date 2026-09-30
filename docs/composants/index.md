# Composants

Un projet du dépôt = une page, qui affiche le `AGENTS.md` du projet : rôle, structure, tests, commandes. La page
se met donc à jour avec le fichier, dans le même commit que le code.

| Projet                                      | Type              | Rôle                                       | État                        |
| ------------------------------------------- | ----------------- | ------------------------------------------ | --------------------------- |
| [`services/designs`](designs.md)            | Service           | Modèles, versions, patrons                 | Référence, en service       |
| [`engines/patterning`](patterning.md)       | Moteur Python     | Mesures → patron                           | Référence, tracé provisoire |
| [`engines/mannequin`](mannequin.md)         | Moteur TypeScript | Mesures → mannequin 3D                     | En service, modules testés  |
| [`engines/manufacturing`](manufacturing.md) | Moteur Python     | Coutures, gradation, coupe, exports        | Squelette                   |
| [`engines/drape`](drape.md)                 | Moteur Python     | Drapé 3D                                   | Squelette                   |
| [`apps/studio`](studio.md)                  | Application web   | Studio de patron                           | En service                  |
| [`packages/features`](features.md)          | Bibliothèque      | Modèles de vue partagés                    | En service                  |
| [`packages/service-kit`](service-kit.md)    | Bibliothèque      | Socle des services                         | En service                  |
| [`contracts`](contrats.md)                  | Contrats          | Schémas, OpenAPI, AsyncAPI                 | En service                  |
| [Autres bibliothèques](bibliotheques.md)    | Bibliothèques     | Noyau, jetons, composants, 3D, générateurs | En service                  |
