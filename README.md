# Atelier — plateforme de confection sur mesure

Du modèle au vêtement livré : mesures et avatar du client, patrons calculés, essayage virtuel en 2D et 3D,
commandes et production en atelier, tissus des vendeurs, prestataires, livraison et communauté.

Ce dépôt contient l'**architecture initiale**, prête pour la **phase 1** (atelier virtuel : obtenir les
patrons, les modifier, les voir sur un mannequin 2D et 3D). Une première tranche fonctionne de bout en bout :
le studio web envoie les mesures au service `designs`, qui fait calculer le patron par le moteur de
patronage (Python) ; le mannequin MakeHuman est ajusté aux mesures dans le navigateur et affiché en 3D.

## Démarrer

Prérequis : Node 22, pnpm 10, [uv](https://docs.astral.sh/uv/) (Python 3.12 installé par uv), Docker.

```bash
pnpm run setup  # dépendances TypeScript et Python
pnpm check      # contrats, lint, types, tests de tous les projets
```

Puis lancer toute la plateforme dans Docker et ouvrir http://localhost:8080 :

```bash
pnpm stack:up
```

Documentation complète, en local : `pnpm docs:serve` (http://127.0.0.1:8000). Historique : [CHANGELOG.md](CHANGELOG.md).
Tout tourne en local, sans service payant ; les vérifications passent avant chaque `git push` (hook `pre-push`).

## Organisation

| Dossier                                  | Rôle                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`contracts/`](contracts/README.md)      | Contrats : JSON Schema, OpenAPI, AsyncAPI (source de vérité, code généré à partir d'eux)                                    |
| `apps/studio`                            | Studio web React (Vite) : mesures, patron 2D, mannequin 3D                                                                  |
| `services/designs`                       | Microservice des modèles, versions et patrons (NestJS, PostgreSQL, outbox) — service de référence                           |
| `engines/patterning`                     | Moteur de patronage (Python, FastAPI) — moteur de référence                                                                 |
| `engines/manufacturing`, `engines/drape` | Moteurs de production (exports) et de drapé : squelettes générés, à remplir en phase 1                                      |
| `engines/mannequin`                      | Moteur mannequin MakeHuman (CC0), repris du prototype, identique navigateur et serveur                                      |
| `packages/*`                             | Bibliothèques TypeScript partagées (noyau, contrats générés, socle des services, jetons, UI, modèles de vue, 3D)            |
| `py/*`                                   | Bibliothèques Python partagées (contrats générés, socle des moteurs)                                                        |
| `tools/`                                 | Générateurs (`pnpm gen …`) et génération des contrats                                                                       |
| `platform/`                              | Infrastructure locale                                                                                                       |
| `docs/`, `mkdocs.yml`                    | Documentation MkDocs : plateforme, architecture, directives, composants, décisions, tableau des travaux (`pnpm docs:serve`) |
| [`prototype/`](prototype/README.md)      | Prototype statique d'origine (croquis, patrons MOD-001, mannequin), figé                                                    |

## Règles

Les règles de code (clean architecture, contrats d'abord, front découplé du design, développement avec des
agents) sont résumées dans [AGENTS.md](AGENTS.md) et vérifiées par `pnpm check`.

## Licences

Code : propriétaire (à préciser). Mannequin : données MakeHuman sous CC0 1.0. Dépendances : licences
permissives uniquement (MIT, Apache 2.0, BSD, ISC, CC0).
