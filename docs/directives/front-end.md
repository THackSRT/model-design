# 7. Front-end adaptable aux changements UI/UX

Un changement de design touche les jetons, les composants et les vues, jamais les modèles de vue ni les appels
d'API. Le front est découpé en quatre couches, de la plus stable (ce que fait l'écran) à la plus changeante
(à quoi il ressemble).

| Couche           | Où                                      | Contient                                                                                                           | Change quand                    |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Modèles de vue   | `packages/features/src/<écran>/`        | Hooks : données (client typé + TanStack Query), état, validation, actions ; aucun JSX ; partagés web et mobile     | Le parcours ou une règle change |
| Vues             | `apps/*/src/screens/<écran>/`           | `screen.tsx` branche un modèle de vue sur `view.tsx`, purement visuel                                              | Le design d'un écran change     |
| Composants       | `packages/ui-web` (`ui-native` à venir) | Boutons, champs, panneaux ; props typées, aucun appel réseau                                                       | La bibliothèque visuelle change |
| Jetons de design | `packages/design-tokens`                | Couleurs, typographie, espacements, au format DTCG, compilés par Style Dictionary en variables CSS et en module TS | La charte change                |

```ts
// packages/features/src/pattern-studio/use-pattern-studio.ts (extrait)
export function usePatternStudio(deps: PatternStudioDeps) {
  // … état de la saisie, appel du service designs, ajustement du mannequin
  return { state, actions }; // { form, errors, status, layout, mannequin, problem } et { setMeasurement, generate, … }
}

// apps/studio/src/screens/pattern-studio/screen.tsx
export function PatternStudioScreen() {
  const deps = useMemo(() => ({ designs: createDesignsClient('/api/designs'), loadMannequin }), []);
  return <PatternStudioView {...usePatternStudio(deps)} />;
}
// view.tsx ne reçoit que { state, actions } : c'est le seul fichier à refaire lors d'un redesign.
```

- **Aucune valeur visuelle en dur** : une règle de lint refuse les couleurs et les tailles en pixels écrites dans
  un composant ou une vue ; on utilise les jetons (`var(--color-accent)`, `ColorMannequin`).
- **Les props disent l'intention**, pas l'apparence : `emphasis="high"`, `tone="danger"`, jamais `color="red"`.
- **Chaque vue est testée dans tous ses états** (repos, calcul, prêt, échec, champ invalide) avec Testing Library ;
  histoires Storybook et captures comparées _(à venir)_.
- **Textes** : tous par des clés de traduction (`t('action.generate')`, `apps/studio/src/i18n/`) ; jamais de
  phrase construite par concaténation. Bibliothèque ICU (pluriels, genres) _(à venir)_.
- **Accessibilité** WCAG 2.2 AA : champs reliés à leur libellé, erreurs annoncées (`role="alert"`), régions
  nommées ; contrastes vérifiés sur les jetons _(à venir)_.
- **Nouveau parcours** derrière un drapeau de fonctionnalité _(à venir)_, pour l'essayer auprès d'ateliers pilotes.
- **3D** : `packages/viewer3d` s'utilise comme un composant déclaratif (`<MannequinView meshes color label />`) ;
  three.js reste caché derrière, et un message remplace la vue sans WebGL.
