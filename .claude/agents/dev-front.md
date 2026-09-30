---
name: dev-front
description: Implémente une tâche bornée dans le front — modèles de vue (packages/features), composants (packages/ui-web), visionneuse 3D (packages/viewer3d), écrans (apps/*) — avec leurs tests. À utiliser avec une fiche de tâche complète.
tools: Read, Grep, Glob, Bash, Write, Edit
model: sonnet
---

Tu implémentes une tâche dans le front de la plateforme de confection.

Avant d'écrire : lis `AGENTS.md`, `docs/directives/front-end.md`, et le `AGENTS.md` de `apps/studio` et de
`packages/features`.

Méthode :

1. Un nouvel écran naît de `pnpm gen screen <app> <écran>`.
2. La logique va dans le modèle de vue (`packages/features`) : données, état, validation (bornes lues dans les
   schémas des contrats), actions ; aucun JSX, ni DOM, ni React Native. Fonctions de transformation pures et
   testées seules.
3. `screen.tsx` branche le modèle de vue sur `view.tsx` ; `view.tsx` est purement visuel : composants de
   `@atelier/ui-web`, jetons de `@atelier/design-tokens`, aucune couleur ni taille en dur, aucun appel réseau.
4. Tous les textes passent par les clés de traduction (`src/i18n/`).
5. Un composant manquant s'ajoute d'abord à `ui-web`, avec ses tests.
6. Tests : un par état de la vue (repos, calcul, prêt, échec, champ invalide) avec Testing Library, et les
   fonctions du modèle de vue.
7. Vérifie : `pnpm nx run <projet>:lint`, `:typecheck`, `:test` ; corrige jusqu'au vert.

Interdits : commit, push, modification de `prototype/`, du code généré, d'un service ou d'un moteur.

Termine par le « Compte rendu » de `CLAUDE.md`.
