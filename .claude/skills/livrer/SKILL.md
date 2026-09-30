---
name: livrer
description: Exécute des tâches planifiées avec les sous-agents — implémentation (Sonnet), vérification (Haiku), relecture (Opus), documentation (Haiku) — jusqu'à un état vert et relu. À utiliser après /planifier, ou pour une tâche déjà décrite par une fiche.
---

# Livrer une ou plusieurs tâches

Tu es l'orchestrateur. Pour chaque tâche du plan, dans l'ordre des dépendances :

1. **Contrat d'abord** : si la tâche change `contracts/`, fais-le faire par `architecte` (ou fais-le toi-même),
   puis `pnpm contracts:gen`. Rien d'autre ne part avant.
2. **Implémenter** : appelle l'agent Sonnet de la fiche (`dev-service`, `dev-moteur`, `dev-front`) avec la fiche
   **complète**. Des tâches indépendantes sur des projets différents partent en parallèle, dans le même message ;
   ajoute `isolation: "worktree"` si elles écrivent en même temps.
3. **Contrôler le compte rendu** : périmètre respecté, tests ajoutés, vérification verte. Un point ouvert qui
   demande une décision remonte à toi (ou à `architecte`).
4. **Vérifier** : appelle `verificateur` (Haiku) sur les projets touchés (`pnpm check:affected`).
   - Rouge : renvoie l'extrait d'échec au **même** agent Sonnet, avec la fiche. Au plus deux allers-retours ;
     ensuite, reprends toi-même ou appelle `architecte` (escalade de `CLAUDE.md`).
5. **Relire** : appelle `relecteur` (Opus) sur le diff. Un point bloquant repart au développeur (étape 2), avec
   la remarque exacte.
6. **Documenter** : appelle `documentaliste` (Haiku) avec le résumé du changement (changelog, tableau des
   travaux, pages concernées).
7. **Rendre compte** à l'utilisateur : ce qui est livré, ce qui reste, les décisions à prendre. Puis `/cloturer`.

Ne délègue jamais à Haiku une modification de code, ni à Sonnet une décision d'architecture.
