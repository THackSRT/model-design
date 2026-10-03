---
name: livrer
description: Exécute des tâches planifiées avec les sous-agents — implémentation (Sonnet), commit par tâche, puis une vérification (Haiku), une relecture (Sonnet, Opus si sensible) et une documentation (Haiku) par lot — jusqu'à un état vert et relu. À utiliser après /planifier, ou pour une tâche déjà décrite par une fiche.
---

# Livrer une ou plusieurs tâches

Tu es l'orchestrateur. Le plan et les fiches sont dans `.claude/lot-en-cours.md` : lis-le d'abord (la session a
pu être vidée par `/clear` ou interrompue). Tiens-le à jour **avant** chaque lancement d'agent et **après**
chaque compte rendu.

## Pour chaque tâche, dans l'ordre des dépendances

1. **Contrat d'abord** : si la tâche change `contracts/`, fais-le faire par `architecte` (ou fais-le toi-même),
   puis `pnpm contracts:gen`. Rien d'autre ne part avant.
2. **Implémenter** : statut « en cours » dans le fichier d'état, puis appelle l'agent Sonnet de la fiche
   (`dev-service`, `dev-moteur`, `dev-front`) avec la fiche **complète**. Des tâches indépendantes sur des
   projets différents partent en parallèle, dans le même message ; ajoute `isolation: "worktree"` si elles
   écrivent en même temps.
3. **Contrôler le compte rendu** : périmètre respecté (`git diff --stat`), tests ajoutés, vérification du
   projet verte. Un point ouvert qui demande une décision remonte à toi (ou à `architecte`). Un agent arrêté sur
   sa règle d'arrêt : lis l'extrait, puis relance-le une fois avec une indication précise, ou reprends la main.
4. **Commiter la tâche** (local, sans push) au format Conventional Commits ; note le commit dans le fichier
   d'état. Puis `/compact` si la session s'allonge.

Rouge que l'agent n'explique pas : appelle `verificateur` pour diagnostiquer, puis renvoie l'extrait au
**même** agent avec la fiche. Au plus deux allers-retours ; ensuite, reprends toi-même ou appelle `architecte`.

## Une fois par lot, quand toutes les tâches sont commitées

5. **Vérifier** : `verificateur` (Haiku) lance `pnpm check:affected`. Un rouge repart à l'agent du projet
   concerné (étape 2), avec l'extrait.
6. **Relire** : `relecteur` sur le diff du lot (`git diff main...HEAD -- <fichiers du lot>`), avec la liste des
   fichiers et les fiches. Sur Sonnet par défaut ; ajoute `model: "opus"` si le lot touche un contrat, la
   sécurité, des données sensibles, une migration de base ou une référence golden. Un point bloquant repart au
   développeur, avec la remarque exacte, puis nouveau commit.
7. **Documenter** : `documentaliste` (Haiku), une seule fois, avec le résumé de toutes les tâches du lot
   (changelog, tableau des travaux, pages concernées).
8. **Rendre compte** à l'utilisateur : ce qui est livré, ce qui reste, les décisions à prendre. Puis `/cloturer`.

Limite d'usage annoncée ou lot long : finis l'étape en cours, mets le fichier d'état à jour, commite ce qui est
vert et ne lance plus d'agent ; la suite se fera avec `/reprendre`.

Ne délègue jamais à Haiku une modification de code, ni à Sonnet une décision d'architecture.
