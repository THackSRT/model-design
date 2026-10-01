# Modèles de vue partagés (web et mobile)

Chaque écran a un hook `useXxx()` qui rend `{ state, actions }`. Données par les clients typés par les contrats
(`src/api`), état, validation (bornes lues dans les schémas des contrats), actions. Aucun JSX, ni DOM, ni
React Native, ni composant visuel (règle de lint). Les fonctions de transformation (`form.ts`, `panels.ts`)
sont pures et testées seules. Nouveau modèle de vue : `pnpm gen screen <app> <écran>`.

Aucun texte d'interface dans ce paquet : le modèle de vue rend des données, des codes et des clés avec leurs
paramètres (ex. `{ code: 'range', minMm, maxMm }`, valeurs en mm) ; l'application les traduit par son catalogue
ICU (`apps/studio/src/i18n/`). Les messages des erreurs de développeur (`throw new Error`) restent hors catalogue.

Formulaire du patron : `garment-fields.ts` décrit les champs de chaque type tracé (`garmentFields(type)`, bornes et
défauts lus dans `jsonSchemas.garmentRequest.$defs`, jamais recopiés) ; `DRAFTED_GARMENT_TYPES` dit quels types sont
tracés (les autres restent visibles mais désactivés). `StudioForm.paramsByType` garde la saisie de chaque type ; la
session garde un `designId` par type et le nom du modèle vient de `PatternStudioDeps.designName`.
