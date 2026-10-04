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
  phrase construite par concaténation. Messages ICU (pluriels, genres, nombres et unités) avec `intl-messageformat` ([ADR 0011](../adr/0011-messages-icu.md)).
- **Accessibilité** WCAG 2.2 AA : champs reliés à leur libellé, erreurs annoncées (`role="alert"`), régions
  nommées ; contrastes vérifiés sur les jetons _(à venir)_.
- **Nouveau parcours** derrière un drapeau de fonctionnalité _(à venir)_, pour l'essayer auprès d'ateliers pilotes.
- **3D** : `packages/viewer3d` s'utilise comme un composant déclaratif (`<MannequinView meshes color label />`) ;
  three.js reste caché derrière, et un message remplace la vue sans WebGL.

## Studio v2 : scène, commandes, dialogues

Règles du studio v2 ([ADR 0022](../adr/0022-interface-du-studio-v2.md), [ADR 0023](../adr/0023-preparation-ia.md)), en
plus des quatre couches ci-dessus.

- **Tout est commande** : une action appelle `dispatch(commande)` ; la commande est validée par son schéma (contrat),
  appliquée au document de modèle par une fonction pure et inscrite à l'historique (annuler, rétablir). Une vue ne
  modifie jamais le document directement. Chaque commande a une description en français : elle sert à la palette
  (⌘K ou « / ») et, plus tard, à l'assistant.
- **Calcul hors du fil principal** : tout calcul de plus de 4 ms (tracé et opérations si besoin, mannequin, drapé)
  passe dans un Worker ; l'écran reçoit des résultats et ne fige jamais.
- **Une scène** : le vêtement reste au centre ; Dessin, Patron et 3D se remplacent sur place. Le fil des six étapes
  change l'inspecteur et les actions, pas la scène, et ne bloque jamais.
- **Manipulation directe** : les zones cliquables viennent des régions du document ; l'anneau d'actions liste les
  opérations applicables au rôle de la zone ; une poignée émet des commandes d'aperçu pendant le geste et une seule
  commande à l'historique quand on la lâche.
- **Dialogues** : seulement pour une tâche ciblée (Mesures, Tissu, Export, Partage, Comparaison) ; Échap ferme, le
  focus est piégé puis rendu, le titre est annoncé ; plein écran sur téléphone. Une action réversible ne demande
  jamais de confirmation : un bandeau « Annuler » reste quelques secondes.
- **Mouvement** : durées et courbes viennent des jetons ; pas d'animation sans utilité ; `prefers-reduced-motion`
  les supprime.
- **Budgets vérifiés** : mise à jour 2D en moins de 16 ms, réponse à un geste en moins de 100 ms, paquet d'entrée
  sous 350 ko compressés, 3D chargée à la demande.
- **Emplacements de l'IA** (derrière un drapeau) : palette en texte libre, panneau Assistant, aperçu d'une
  proposition (différence sur la scène, puis accepter ou refuser). Le front ne parle jamais directement à un
  fournisseur d'IA.
