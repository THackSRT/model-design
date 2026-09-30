# 11. Revue et définition de « terminé »

Toute demande de fusion passe les mêmes vérifications automatiques puis la revue d'un humain, qu'elle vienne d'un
développeur ou d'un agent. Rien n'est fusionné au rouge. Les vérifications tournent **en local** : c'est gratuit
et plus rapide ([ADR 0006](../adr/0006-local-d-abord.md)).

## Vérifications

`pnpm check` (et, avant chaque `git push`, le hook local qui lance `pnpm check:affected`) :

1. Formatage (Prettier).
2. Contrats : le code généré correspond aux contrats (`pnpm contracts:check`).
3. Lint et frontières d'architecture (étiquettes Nx, règles par couche, import-linter).
4. Types (TypeScript strict, mypy strict).
5. Tests de tous les projets concernés.
6. Documentation : `pnpm docs:build` construit ce site en mode strict (liens cassés refusés).

L'intégration continue GitHub (`.github/workflows/ci.yml`) rejoue les mêmes étapes ; elle est facultative et se
lance à la main tant que le projet reste sur un compte gratuit. Analyse de sécurité des dépendances et
propriétaires de code (`CODEOWNERS`) _(à venir)_.

## Questions de revue

- Le code est-il dans la bonne couche et le bon service ?
- Les noms suivent-ils le langage commun, et les unités sont-elles explicites ?
- Chaque critère d'acceptation a-t-il son test, et les tests décrivent-ils des comportements ?
- Un redesign de l'écran concerné toucherait-il seulement la vue ?
- Le changement de contrat est-il compatible, ou versionné ?
- Des données sensibles peuvent-elles fuiter (journaux, erreurs, événements) ?
- La documentation touchée est-elle à jour ?

## Définition de « terminé »

- [ ] `pnpm check` passe.
- [ ] Contrats mis à jour et code régénéré, compatibilité vérifiée.
- [ ] Tests ajoutés pour chaque comportement nouveau ou corrigé.
- [ ] Textes de l'interface en clés de traduction.
- [ ] `AGENTS.md` du projet, langage commun, ADR et pages de ce site à jour si le changement les concerne.
- [ ] Ligne au `CHANGELOG.md` pour un changement visible, statut mis à jour dans le
      [tableau des travaux](../suivi/travaux.md).
- [ ] Migration de base réversible ou accompagnée d'un plan de retour arrière.
- [ ] Revue humaine approuvée.
