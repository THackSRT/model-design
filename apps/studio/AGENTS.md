# Studio web

Rôle : écran de la phase 1 — mesures, choix du vêtement (jupe droite, jupe cercle, pantalon ; corsage « à venir ») et ses paramètres, patron 2D, mannequin 3D.

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
