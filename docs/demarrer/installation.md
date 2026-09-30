# Installation

Tout se fait en local, sans service payant ([ADR 0006](../adr/0006-local-d-abord.md)).

## Prérequis

| Outil   | Version                           | Rôle                                                         |
| ------- | --------------------------------- | ------------------------------------------------------------ |
| Node.js | 22 (voir `.nvmrc`)                | Applications, services, outillage                            |
| pnpm    | 10 (activé par `corepack enable`) | Espace de travail TypeScript                                 |
| uv      | 0.8 ou plus                       | Espace de travail Python ; installe Python 3.12 tout seul    |
| Docker  | récent, avec Compose              | Infrastructure et pile complète (facultatif pour développer) |
| Git     | récent                            | Le hook `pre-push` lance les vérifications                   |

## Installer

```bash
git clone <dépôt> atelier && cd atelier
corepack enable
pnpm setup      # pnpm install + uv sync --all-packages ; active aussi le hook git pre-push
pnpm check      # formatage, contrats, lint, types, tests, documentation
```

## Cache partagé Nx Cloud (gratuit)

Nx garde en cache le résultat des tâches (lint, types, tests, build). Le dépôt est relié à Nx Cloud (offre
gratuite Hobby, identifiant `nxCloudId` dans `nx.json`) : ce cache est partagé entre les postes, et une tâche déjà
calculée par un autre membre n'est pas relancée. Rien à faire de plus sur un nouveau poste ; sans accès réseau,
tout fonctionne avec le cache local.

## Lancer la tranche phase 1 sans Docker

Trois terminaux :

```bash
pnpm nx run patterning:dev                                                   # moteur de patronage, port 3201
pnpm nx run @atelier/designs:build && pnpm --filter @atelier/designs start   # service designs, port 3101
pnpm nx run @atelier/studio:dev                                              # studio, http://localhost:5173
```

Sans `DATABASE_URL`, le service garde ses données en mémoire. Avec PostgreSQL (`pnpm dev:infra`), copier
`.env.example` et lancer le service avec `DATABASE_URL` et `MIGRATE_ON_START=true`.

## Lancer toute la pile dans Docker

```bash
pnpm stack:up     # construit les images et démarre tout, puis http://localhost:8080
pnpm stack:down
```

Détails : [Conteneurs Docker](conteneurs.md).

## Documentation

```bash
pnpm docs:serve   # ce site en local, rechargé à chaque modification : http://127.0.0.1:8000
pnpm docs:build   # construction stricte dans site/ (liens cassés refusés)
```
