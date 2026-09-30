# 3. Organisation du dépôt

Tout le code vit dans un seul dépôt (monorepo), mais chaque microservice se construit, se teste et se déploie
seul. Un seul dépôt donne aux humains comme aux agents la vue complète : contrats, services qui les produisent et
applications qui les consomment. Les frontières entre dossiers sont vérifiées par les outils, pas laissées à la
bonne volonté.

```text
atelier/
├─ AGENTS.md              règles pour les agents (CLAUDE.md y renvoie)
├─ contracts/             source de vérité des échanges
│  ├─ openapi/            routes HTTP d'un service ou d'un moteur
│  ├─ asyncapi/           événements (NATS JetStream, enveloppe CloudEvents)
│  └─ schemas/            JSON Schema des corps (GarmentSpec, MeasurementSet…)
├─ apps/
│  └─ studio/             web React : atelier de patron (mobile Expo, admin, widget : à venir)
├─ services/              un dossier = un microservice TypeScript
│  └─ designs/            service de référence (15 autres à venir)
├─ engines/               moteurs de calcul
│  ├─ mannequin/          TypeScript, partagé navigateur et serveur
│  ├─ patterning/         Python : moteur de référence
│  ├─ manufacturing/      Python : coutures, gradation, plan de coupe, exports (squelette)
│  └─ drape/              Python : drapé 3D (squelette) ; render, fabric, ai à venir
├─ packages/              bibliothèques TypeScript partagées
│  ├─ kernel/             Result, identifiants typés, Money, longueurs, horloge
│  ├─ contracts-ts/       types et schémas générés (ne pas modifier src/generated)
│  ├─ service-kit/        journaux, configuration, validation, erreurs RFC 9457, client HTTP
│  ├─ design-tokens/      jetons de design (Style Dictionary)
│  ├─ ui-web/             composants d'interface, sans logique métier (ui-native à venir)
│  ├─ features/           modèles de vue partagés entre web et mobile
│  └─ viewer3d/           visionneuse three.js
├─ py/                    bibliothèques Python : contracts (généré), engine-kit
├─ tools/                 contracts/ (génération), generators/ (pnpm gen …)
├─ platform/              docker-compose.yml (infrastructure et pile locale)
├─ docs/                  cette documentation (MkDocs)
└─ prototype/             prototype statique d'origine, figé
```

## Qui peut importer quoi

Règle vérifiée par les étiquettes Nx (`@nx/enforce-module-boundaries`, voir `eslint.config.mjs`).

| Étiquette                                      | Projets                | Peut importer                                           | Ne peut jamais importer                |
| ---------------------------------------------- | ---------------------- | ------------------------------------------------------- | -------------------------------------- |
| `type:app`                                     | `apps/*`               | features, ui, tokens, contracts, viewer, kernel, engine | un service, une autre app              |
| `type:service`                                 | `services/*`           | kernel, service-kit, contracts                          | un autre service, une app, l'UI        |
| `type:engine`                                  | `engines/mannequin`    | kernel, contracts                                       | un service                             |
| `type:feature`                                 | `packages/features`    | kernel, contracts, engine                               | l'UI, le DOM, React Native             |
| `type:ui`                                      | `packages/ui-web`      | tokens                                                  | features, contracts, tout appel réseau |
| `type:viewer`                                  | `packages/viewer3d`    | kernel                                                  | le reste                               |
| `type:service-kit`                             | `packages/service-kit` | kernel, contracts                                       | un service                             |
| `type:kernel`, `type:contracts`, `type:tokens` | bibliothèques de base  | rien                                                    | tout                                   |

Côté Python, chaque moteur n'importe que `py/*` ; ses couches sont vérifiées par import-linter
(`engines/*/.importlinter`).

Les bibliothèques partagées ne contiennent aucune règle propre à un seul contexte métier : une règle de commande
vit dans `services/orders`, même si deux services en ont besoin (l'autre la reçoit par API ou par événement).

## Outils

| Outil                        | Choix                                                   | Rôle                                                                          |
| ---------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Espace de travail TypeScript | pnpm + Nx                                               | Graphe des projets, build et tests des seuls projets touchés, frontières      |
| Espace de travail Python     | uv (workspace), Python 3.12                             | Environnements reproductibles pour les moteurs                                |
| Qualité TypeScript           | ESLint + typescript-eslint, Prettier, TypeScript strict | Style et erreurs détectés avant l'exécution                                   |
| Qualité Python               | Ruff, mypy strict, import-linter                        | Mêmes exigences côté moteurs                                                  |
| Générateurs                  | `pnpm gen service\|engine\|event\|screen`               | Toute structure nouvelle naît d'un gabarit                                    |
| Conteneurs                   | Docker, une image par service, moteur et application    | Déploiement indépendant (voir [Conteneurs Docker](../demarrer/conteneurs.md)) |
| Documentation                | MkDocs Material                                         | Ce site, construit en local                                                   |
