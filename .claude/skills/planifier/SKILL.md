---
name: planifier
description: Découpe une demande en tâches assignées aux bons agents (Opus, Sonnet, Haiku) et les inscrit au tableau des travaux. À utiliser au début de tout travail de plus d'une tâche, ou quand l'utilisateur demande un plan.
---

# Planifier une demande

Tu es l'orchestrateur (session principale, idéalement Opus). Objectif : un plan que des sous-agents peuvent
exécuter sans voir la conversation.

1. **Comprendre** : reformule la demande en une phrase de résultat visible. S'il manque une décision qui
   appartient à l'utilisateur, pose la question avant de planifier.
2. **Explorer, si besoin** : délègue à `explorateur` (Haiku) les recherches (« où est… », « qu'existe-t-il
   déjà pour… ») ; plusieurs recherches indépendantes partent en parallèle.
3. **Concevoir** : si la demande touche un contrat, plusieurs services, la sécurité ou une migration, ou si
   l'approche est à choisir, délègue à `architecte` (Opus) la conception et le découpage. Sinon, découpe toi-même.
4. **Découper** en tâches d'une demande de fusion chacune (environ 400 lignes hors code généré), chacune au
   format « fiche de tâche » de `CLAUDE.md`, avec :
   - l'agent (`dev-service`, `dev-moteur`, `dev-front`, `documentaliste`) selon la table de `CLAUDE.md` ;
   - les dépendances : le contrat d'abord, seul ; puis les tâches indépendantes en parallèle ;
   - la commande de vérification exacte.
5. **Inscrire** les tâches dans `docs/suivi/travaux.md` (statut ⬜, numéro suivant de la phase en cours),
   directement ou par `documentaliste`.
6. **Présenter** le plan à l'utilisateur : un tableau n° · tâche · agent · modèle · dépend de. Attends son accord
   avant de lancer `/livrer` si le plan compte plus de trois tâches ou touche un contrat.
