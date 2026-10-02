# Studio web

Rôle : deux onglets (`app-tabs.tsx`). **Patron** : mesures, choix du vêtement (jupe droite, jupe cercle, pantalon ; corsage « à venir ») et ses paramètres, patron 2D, mannequin 3D. **Tissus** : banc d'essai des tissus (ADR 0015).

- `src/screens/<écran>/screen.tsx` branche un modèle de vue de `@atelier/features` sur `view.tsx`.
- `garment-panel.tsx` (choix du type et champs décrits par `garmentFields`) complète `view.tsx`, qui est purement visuel : composants `@atelier/ui-web`, jetons `@atelier/design-tokens`, aucun appel
  réseau, aucune couleur ni taille en dur (règle de lint).
- Textes : `src/i18n/fr.ts` (catalogue au format ICU, ADR 0011) et `t(key, values?)` (clés vérifiées par TypeScript,
  pluriels, select, nombres et unités en français via `intl-messageformat`) ; jamais de phrase écrite dans un
  composant ni de concaténation. `packages/features` ne rend que des données et des clés.
- 3D : `three.js` est chargé à la demande (`lazy-mannequin-view.tsx`, `Suspense`) ; la vue importe les silhouettes
  depuis `@atelier/viewer3d/outline`, jamais `MannequinView` en import statique (le paquet initial reste sans three.js).
- `src/platform/` : ce qui dépend du navigateur. Le mannequin s'ajuste dans un Web Worker (`mannequin.worker.ts`,
  protocole pur `fit-protocol.ts`, adaptateur `worker-fitter.ts` du port `MannequinFitter` de `@atelier/features`).
- Les services sont appelés via `/api/<service>` (proxy Vite en local, passerelle en production).
- Tests : `test/view.test.tsx`, un test par état de la vue (repos, calcul, prêt, échec, champ invalide).
- Commandes : `pnpm nx run @atelier/studio:dev|test|lint|typecheck|build`.
- Pièces de coupe : `cut-pieces-panel.tsx` dessine le SVG depuis le JSON `CutPattern` (jamais en injectant le SVG
  exporté : pas de `dangerouslySetInnerHTML`) ; `platform/download.ts` enregistre un fichier (Blob + lien temporaire,
  URL libérée). Rien n'est gardé en local (pièces et fichiers dérivent des mesures d'un client).
- Onglets : état local reflété dans `location.hash` (`#tissus`, sinon Patron ; `tabFromHash` pure). Un onglet
  visité reste monté mais masqué (`keepMounted` de `Tabs`) : la saisie de l'autre onglet survit ; un onglet jamais
  visité n'est pas monté. L'onglet Tissus est chargé à la demande (`lazy-fabric-bench.tsx`, `React.lazy`),
  comme la vue 3D. Les textes du banc (`i18n/fr-bench.ts`) ne sont pas dans l'entrée : `i18n/bench.ts` les ajoute
  au catalogue (`registerMessages`) à l'import de l'écran ; `t()` lève une erreur sur une clé absente plutôt que d'afficher
  la clé. Seules les clés `tabs.*` et `fabricBench.loading` restent dans `fr.ts`.
- Historique (`history-panel.tsx`, `comparison-view.tsx`, `history-format.ts` pure) : panneau repliable (`details`) de
  l'onglet Patron, visible dès qu'un modèle a été calculé dans la session (`useStudioHistory` de features garde le dernier modèle
  quand un patron est effacé). `screen.tsx` branche `useStudioHistory` ; « Reprendre » lit la version puis demande confirmation (prop
  `confirm`, `window.confirm` par défaut) si `state.dirty`, puis `resume(n, form)` et `applyForm` ; refus = rien ne
  change. Longueurs en cm, aires en cm² (ICU `scale/`), jamais de mesures dans la liste. Clés `history.*` dans `fr.ts`.
- Banc d'essai (`screens/fabric-bench/`) : `screen.tsx` branche `useFabricBench` (export par `browserFileSaver`, essai de Cusick par `getCusickRunner`) ; `view.tsx` assemble
  `preset-list`, `measurements-panel` (champs, bornes et conseils pilotés par `BENCH_TESTS`, jamais recopiés),
  `comparison-panel` (colonne « Tolérance » lue dans `BENCH_TOLERANCES`, `toleranceLabel`), `drape-panel` (affiché si `drapeTestAvailable`), `review-panel` et `report-bar`. Erreurs de saisie, d'import et avis sont traduits par
  `i18n/bench.ts` (clés `fabricBench.*`, `fabric.preset.*`, `fabric.property.*`). `platform/read-file.ts` lit le
  rapport (au plus la limite + 1 octet) ; `platform/unsaved-guard.ts` n'arme `beforeunload` que si des
  modifications ne sont pas exportées. Le commentaire importé est un texte libre : jamais de HTML.
- Essai de drapé de Cusick (1.39h) : `platform/cusick.worker.ts` (Web Worker, fichier séparé : le moteur de drapé n'est
  que dans son chunk), protocole pur `cusick-protocol.ts` (`handleCusickRequest`, contour transféré), adaptateur
  `worker-cusick.ts` du port `CusickRunner` (délai 60 s, worker recréé après un plantage, une relance au plus, réponses
  d'un ancien worker ignorées), `cusick.ts` (`getCusickRunner`, worker créé à la première simulation, maillage 7,5 mm).
  `drape-panel.tsx` dessine les deux ombres en SVG (viewBox en mm, `drape-shape.ts`) avec jetons seulement ; un essai non
  convergé est signalé « indicatif », un essai relu d'un rapport n'a pas de contour. Clés `fabricBench.drape.*`
  et `fabricBench.tolerance.*`.
- Traduction : `t(key: CoreMessageKey)` ne connaît que `fr.ts` (catalogue d'entrée) ; les vues du banc utilisent
  `tBench` (`i18n/bench.ts`), dont l'import enregistre `fr-bench.ts` ; une clé du banc passée à `t` est refusée par
  TypeScript. Clé absente : erreur en développement et en test, mais en production `console.error` une fois par clé et
  chaîne vide (jamais de page blanche) ; `translate(key, values, strict, report)` est la fonction pure testée.
- File du Worker de Cusick : `worker-cusick.ts` garde sa file et n'envoie qu'un essai à la fois ; le délai (60 s) court
  depuis l'envoi. Un délai dépassé ne rejette que l'essai en cours (Worker recréé, la file continue).
- Import d'un rapport avec des modifications non exportées : `FabricBenchScreen` demande confirmation (prop `confirm`,
  `window.confirm` par défaut) ; refus = rien ne change.
