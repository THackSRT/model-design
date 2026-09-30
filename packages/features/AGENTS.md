# Modèles de vue partagés (web et mobile)

Chaque écran a un hook `useXxx()` qui rend `{ state, actions }`. Données par les clients typés par les contrats
(`src/api`), état, validation (bornes lues dans les schémas des contrats), actions. Aucun JSX, ni DOM, ni
React Native, ni composant visuel (règle de lint). Les fonctions de transformation (`form.ts`, `panels.ts`)
sont pures et testées seules. Nouveau modèle de vue : `pnpm gen screen <app> <écran>`.
