# 13. Recettes

Les gestes les plus fréquents, pas à pas ; chacun commence par un générateur, pour que le résultat ait dès le
départ la forme attendue.

## Ajouter un microservice

1. Écrire une ADR courte : contexte métier, données possédées, pourquoi un service existant ne convient pas.
2. `pnpm gen service <nom>` : dossier en quatre couches, `AGENTS.md`, `composition.ts`, `main.ts`, Dockerfile,
   migration initiale (outbox), test de santé, et `contracts/openapi/<nom>.yaml`.
3. `pnpm install`, puis décrire les corps dans `contracts/schemas/` et les routes dans l'OpenAPI ;
   `pnpm contracts:gen`.
4. Coder le domaine et les cas d'usage avec leurs tests, puis les adaptateurs (modèle : `services/designs`).
5. Ajouter le service à `platform/docker-compose.yml` et sa route à la passerelle locale (`apps/studio/nginx.conf`).
6. Compléter le langage commun et la table des services de l'architecture.

## Ajouter un événement

1. `pnpm gen event <entité>.<verbe> --producer <service>` : schéma JSON et entrée AsyncAPI.
2. Remplir le schéma (identifiants et faits, pas d'objets entiers ni de données sensibles), `pnpm contracts:gen`.
3. Producteur : produire l'événement dans le domaine, l'enregistrer par l'outbox, tester qu'il sort bien.
4. Consommateurs : un gestionnaire idempotent par service abonné, testé en rejouant le même événement deux fois.

## Ajouter un écran

1. `pnpm gen screen <app> <écran>` : modèle de vue dans `packages/features`, `screen.tsx` et `view.tsx`.
2. Exporter le modèle de vue dans `packages/features/src/index.ts` ; écrire sa logique et tester ses fonctions
   de transformation.
3. Construire la vue uniquement avec les composants et les jetons existants ; un composant manquant s'ajoute
   d'abord à `ui-web`, avec ses tests.
4. Tester chaque état de la vue ; ajouter les textes au catalogue de traduction.

## Ajouter un moteur

1. ADR : entrées, sorties, temps visé, besoin de GPU, licences des bibliothèques et des poids.
2. `pnpm gen engine <nom>` : `core/`, `spec/`, `api/`, `main.py`, Dockerfile, test de santé ; le moteur est
   ajouté à l'espace uv. Puis `uv sync --all-packages --all-groups`.
3. Décrire l'entrée et la sortie en JSON Schema (et les événements `<nom>.completed` / `<nom>.failed` pour un
   moteur lourd), puis `pnpm contracts:gen`.
4. Coder le cœur pur et ses tests de propriétés, puis les adaptateurs ; fixer les premières références golden
   avec un expert métier ; ajouter le moteur à `platform/docker-compose.yml`.
