---
name: cloturer
description: Termine un lot de travail — vérification complète, derniers commits au format Conventional Commits, push sur la branche de travail, fichier d'état du lot vidé. À utiliser quand /livrer a rendu un état vert et relu.
---

# Clôturer un lot

Tu es l'orchestrateur ; toi seul commites et pousses.

1. Lance `pnpm check` (ou fais-le lancer par `verificateur`). Tout doit être vert, documentation comprise.
2. Relis `git status` et `git diff --stat` : aucun fichier hors périmètre, aucun artefact (`dist/`, `site/`,
   caches), aucun secret.
3. Vérifie que `CHANGELOG.md` et `docs/suivi/travaux.md` reflètent le lot.
4. Commite ce qui reste (relecture, documentation) par sujet, au format Conventional Commits avec le projet en
   portée (`feat(designs): liste des versions`), avec un corps qui dit quoi et pourquoi. Les tâches sont déjà
   commitées une par une par `/livrer`.
5. Pousse sur la branche de travail (`git push -u origin <branche>`) : le hook `pre-push` relance
   `pnpm check:affected`. Jamais `--no-verify`, jamais de push sur `main`. Si le push échoue (connexion),
   les commits restent en local : note-le dans le fichier d'état et réessaie plus tard.
6. Une fois poussé, supprime `.claude/lot-en-cours.md` et les arbres séparés intégrés (`git worktree list`).
7. Résume à l'utilisateur : commits, ce qui est livré, ce qui reste au tableau des travaux. Conseille `/clear`
   avant le lot suivant.
