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

`useStudioHistory(deps, studio, confirm)` (`design-history/`) branche l'historique sur le studio : garde le dernier modèle
de la session, lit la version, puis confirme sur la saisie COURANTE (`dirty`) et applique (`ResumeOutcome` : `applied`,
`declined`, `superseded` si un calcul (`state.runs`) a démarré pendant la lecture, `stale` si le modèle a changé,
`failed`). `dirty` ne devient faux qu'à la création d'une version (calcul réussi) ou à une reprise.

`actions.applyForm(form)` remplace tout le formulaire et efface le patron (reprise d'une version) ; `state.dirty` dit
que la saisie a changé depuis le dernier calcul ou la dernière reprise.

Pièces de coupe : `cut-pieces/` (`useCutPieces`, `layoutCutPieces` pure) demande les pièces d'une version
(`POST …/cut-patterns`, corps `{}`) et lance les téléchargements (`exportFile`). L'enregistrement d'un fichier passe
par le port `FileSaver`, branché par l'application ; le nom de fichier vient de `Content-Disposition` par un motif
strict (`exportFileName`, repli `patron.<ext>`). Corsage : `sleeve` est un sous-objet facultatif (`withSleeve`,
`sleeveCm`, champs de `sleeveFields()`) ; ses erreurs sont indexées `sleeve.<champ>`.

Historique d'un modèle : `useDesignHistory(deps, { designId, versionNumber })` (`design-history/`) rend `{ state, actions }`.
On lui donne le `designId` et le `versionNumber` de `usePatternStudio` : la première page de résumés
(`state.versions`, sans mesures, la plus récente d'abord, `HISTORY_PAGE_SIZE` = 20) est relue à chaque nouvelle
version, et tout est vidé au changement de modèle. `state` : `status` (`idle` | `loading` | `ready` | `failed`),
`versions`, `hasMore`, `loadingMore`, `problem?`, `resume` (`ResumeState`), `comparison` (`ComparisonState`).
`actions` : `loadMore()` (curseur opaque, dédoublonné par numéro), `resume(n, base?)` (promesse d'un `Result` portant
le `StudioForm` rendu par `versionToForm` : le studio applique ce formulaire, rien n'est appliqué ici),
`compare(from, to)` puis `state.comparison.result` (`VersionComparison` : `changes` du service, plus `panels` : aire
mm² et périmètre mm par pièce de même `id`, courbes de Bézier aplaties en 64 segments, pour l'affichage seulement,
ADR 0014), `clearComparison()`. `versionToForm` ne complète jamais par un défaut : un champ absent de la version reste
absent. Une version contient les mesures d'un client : rien n'est écrit dans le stockage du navigateur, ni cache
(les lectures du client sont `cache: 'no-store'`). Limite connue : sans liste des modèles d'une organisation (ADR 0014),
l'historique est celui du modèle de la session ; il n'y a pas d'historique après un rechargement de la page.

Rapport de validation des tissus : `fabric-bench/report-file.ts` lit un fichier non fiable
(`parseFabricValidationReport` : 256 Kio en octets, JSON, version lue dans le schéma, validation stricte, une seule
revue par préréglage) et rend une erreur à code traduisible (`ReportImportError`) ; `serializeFabricValidationReport`
rend un JSON stable. `fabric-bench/schema-check.ts` est un validateur minimal de JSON Schema piloté par
un registre local de six schémas (`SCHEMA_REGISTRY` ; un `$ref` hors registre lève une `Error`) (pas d'Ajv : CSP stricte) ; un mot-clé hors du sous-ensemble lève une `Error`, et le test de
couverture parcourt les schémas `fabric-*`. Un nouveau mot-clé dans ces schémas demande de l'ajouter à `CHECKS`.

Banc d'essai des tissus : `useFabricBench(deps)` (`fabric-bench/use-fabric-bench.ts`) rend `{ state, actions }`, une
revue (`PresetBenchState`) par préréglage de `@atelier/drape`. Les champs de saisie et leurs bornes sont lus dans
`fabricBenchMeasurements` (`measurement-fields.ts`, `BENCH_TESTS`), les bornes de `Fabric` dans `fabricJsonSchema`
(`fabric-bounds.ts`). Le brouillon est indexé par chemin (`stretchWarp.loadedLengthMm`, `thickness.readingsMm.2`) ;
`buildMeasurements` n'en garde que les essais complets et valides, les erreurs (`BenchError`) portent le même chemin.
Les calculs (grandeurs déduites, écarts, valeurs candidates) sont ceux de `@atelier/drape` ; `settle` (`bench-model.ts`)
recalcule tout ce qui se déduit des entrées. L'essai de Cusick passe par le port `CusickRunner` (branché par le
studio, Worker) ; un résultat périmé (tissu simulé modifié entre-temps) est ignoré. `toReport` et `fromReport`
(`report-mapping.ts`) font le va-et-vient avec le rapport du contrat ; l'export passe par `FileSaver` après un
garde-fou `checkSchema`. Les actions s'exécutent sur un accès synchrone à l'état (`BenchStore`), sans rendu entre deux.

Paquet : `"sideEffects": false` (aucun module n'a d'effet à l'import) permet à Vite de laisser hors du paquet d'entrée du studio le code du banc (`fabric-bench/*`), importé seulement par son écran chargé à la demande. Ne pas ajouter d'effet de bord à l'import.

L'objet agrégé `jsonSchemas` est interdit dans `src/` (règle `no-restricted-imports`) : il ramène tous les schémas du
contrat dans le paquet d'entrée du studio ; importer le schéma par son nom (`fabricJsonSchema`…). Pour l'écran :
`PresetBenchState.drapeComparisons` (`{ estimated, candidate }`, chacun `DrapeComparison` ou `undefined`) compare le
coefficient de drapé mesuré à chaque essai prêt (il remplace `drapeComparison`) ; `candidateSource` (`'corrected'` ou
`'candidate'`) dit d'où vient le tissu de l'essai « candidat ».
