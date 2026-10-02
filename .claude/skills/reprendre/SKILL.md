---
name: reprendre
description: Reprend un lot de travail après une interruption (coupure de connexion, limite d'usage, session fermée) à partir du fichier d'état .claude/lot-en-cours.md, de git et du tableau des travaux. À utiliser au début d'une nouvelle session quand un lot était en cours.
---

# Reprendre un lot interrompu

Tu es l'orchestrateur, dans une session neuve. La conversation d'avant est perdue ou trop longue pour être
rechargée : l'état du lot est dans `.claude/lot-en-cours.md`, git et `docs/suivi/travaux.md`.

1. **Lire l'état** : `.claude/lot-en-cours.md` (branche, objectif, tâches et statuts, décisions, dernière
   vérification). S'il manque, reconstitue-le avec `git log --oneline main..HEAD`, `git status` et les lignes
   🟡 du tableau des travaux, puis écris-le.
2. **Contrôler git** : bonne branche ; `git status` et `git diff --stat`. Les tâches commitées sont faites. Les
   fichiers modifiés non commités appartiennent à la tâche notée « en cours » : rattache-les à son périmètre.
   Un fichier hors de tout périmètre se signale à l'utilisateur.
3. **Ne rien détruire** : jamais `git checkout .`, `git clean`, `git reset` ni `git stash` pour « repartir
   propre ». Un travail partiel se termine, il ne se jette pas sans l'accord de l'utilisateur.
4. **Arbres séparés** : `git worktree list`. Pour chaque arbre d'un agent interrompu, regarde son
   `git status` ; intègre le travail vert, ou relance l'agent dans cet arbre. Ne supprime un arbre qu'une fois
   son travail intégré ou abandonné avec accord.
5. **Processus orphelins** (Windows) : un serveur de développement, un `node` ou un shell Python resté ouvert
   peut tenir un port (3101, 3201, 5173, 8000) ou un fichier. Repère-le (`netstat -ano`, `tasklist`) et
   arrête-le avant de relancer une vérification.
6. **Vérifier l'état réel** : fais lancer par `verificateur` la vérification du projet de la tâche
   interrompue (pas `pnpm check` entier). Note le résultat dans le fichier d'état.
7. **Relancer** : la tâche interrompue repart vers le **même** agent avec sa fiche complète et une rubrique
   « Reprise » : fichiers déjà modifiés, résultat de la vérification, ce qui reste à faire. Les tâches
   suivantes reprennent le cours de `/livrer`.
8. **Rendre compte** à l'utilisateur en quelques lignes : ce qui était fait, ce qui a été repris, ce qui reste.

Limite d'usage atteinte pendant la reprise : même règle qu'en cours de lot (finir l'étape, mettre à jour le
fichier d'état, commiter le vert, ne plus lancer d'agent).
