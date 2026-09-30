# Atelier — plateforme de confection sur mesure

Du modèle au vêtement livré : mesures et avatar du client, patrons calculés, essayage virtuel en 2D et 3D,
commandes et production en atelier, tissus des vendeurs, prestataires, livraison et communauté.

!!! info "Où en est le projet"
**Phase 1 — atelier virtuel, en cours.** L'architecture initiale est en place et une première tranche
fonctionne de bout en bout : le studio web envoie les mesures au service `designs`, qui fait calculer le
patron par le moteur de patronage ; le mannequin MakeHuman est ajusté aux mesures dans le navigateur et
affiché en 3D. Détail et prochaines étapes : [Phase 1](suivi/phase-1.md) · reste à faire : [Tableau des travaux](suivi/travaux.md) · historique : [Changelog](suivi/changelog.md).

## Par où commencer

| Vous voulez…                                     | Lisez                                            |
| ------------------------------------------------ | ------------------------------------------------ |
| Installer le projet et lancer la tranche phase 1 | [Installation](demarrer/installation.md)         |
| Lancer toute la pile dans Docker                 | [Conteneurs Docker](demarrer/conteneurs.md)      |
| Comprendre ce que l'on construit                 | [Architecture du système](architecture/index.md) |
| Savoir comment écrire le code                    | [Directives de codage](directives/index.md)      |
| Contribuer (humain ou agent)                     | [Contribuer](demarrer/contribuer.md)             |
| Connaître un projet du dépôt                     | [Composants](composants/index.md)                |
| Comprendre une décision                          | [Décisions (ADR)](adr/index.md)                  |

## Comment cette documentation vit

Cette documentation est **rédigée au fil du projet** et versionnée avec le code : une demande de fusion qui
change un comportement met à jour la page qui le décrit, dans le même commit. Les deux documents de référence,
[Architecture](architecture/index.md) et [Directives](directives/index.md), ont d'abord été rédigés comme
documents partagés ; ce site en est désormais la version de référence. Les règles de rédaction sont dans
[Rédiger la documentation](demarrer/documentation.md).
