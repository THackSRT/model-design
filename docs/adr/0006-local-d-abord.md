# 0006 — Local d'abord, zéro dépense

**Contexte.** Le projet n'a pas de budget d'outillage ni d'hébergement : pas de compte GitHub payant, pas de
cloud. Tout ce qui peut tourner sur un poste doit y tourner.

**Décision.**

- Les vérifications (`pnpm check:affected`) tournent **avant chaque `git push`**, par le hook
  `.githooks/pre-push`, activé automatiquement par `pnpm install` (`git config core.hooksPath .githooks`).
- L'intégration continue GitHub reste disponible mais ne se lance qu'à la main (`workflow_dispatch`).
- Nx Cloud, dans son offre gratuite (Hobby), partage le cache des tâches entre les postes : une tâche déjà
  calculée ailleurs n'est pas recalculée. Sans connexion, le cache reste local et tout fonctionne pareil.
- La documentation (MkDocs) se sert et se construit en local (`pnpm docs:serve`, `pnpm docs:build`) ; pas de
  GitHub Pages, qui demande un compte payant pour un dépôt privé.
- Toute la plateforme tourne dans Docker sur le poste (`pnpm stack:up`), avec des briques libres : PostgreSQL,
  NATS, Valkey, SeaweedFS (stockage S3).

**Conséquences.** Chacun doit lancer les vérifications chez lui : le hook le fait, et `git push --no-verify` se
signale dans la demande de fusion. Quand un budget existera, on réactivera l'intégration continue sur chaque
demande de fusion et on choisira l'hébergement (architecture, section 8), par une nouvelle ADR.
