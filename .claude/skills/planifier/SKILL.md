---
name: planifier
description: Découpe une demande en tâches assignées aux bons agents (Opus, Sonnet, Haiku), les inscrit au tableau des travaux et au fichier d'état du lot. À utiliser au début de tout travail de plus d'une tâche, ou quand l'utilisateur demande un plan. Se déroule dans la session principale, jamais dans un sous-agent.
---

# Planifier une demande

Tu es l'orchestrateur (session principale, Opus). Tu planifies toi-même, sans déléguer le découpage. Objectif :
un plan que des sous-agents peuvent exécuter sans voir la conversation, et qu'une session neuve peut reprendre.

1. **Comprendre** : reformule la demande en une phrase de résultat visible. S'il manque une décision qui
   appartient à l'utilisateur, pose la question avant de planifier.
2. **Explorer, si besoin** : délègue à `explorateur` (Haiku) les recherches (« où est… », « qu'existe-t-il
   déjà pour… ») ; plusieurs recherches indépendantes partent en parallèle. Ne lis pas toi-même de gros fichiers.
3. **Concevoir** : si la demande change un contrat ou demande une ADR, ou si l'approche est à choisir entre
   plusieurs options sérieuses, appelle `architecte` (Opus) pour ce point précis. Le découpage reste à toi.
4. **Découper** en tâches d'une demande de fusion chacune (environ 400 lignes hors code généré), chacune au
   format « fiche de tâche » de `CLAUDE.md`, avec :
   - l'agent (`dev-service`, `dev-moteur`, `dev-front`, `documentaliste`) selon la table de `CLAUDE.md` ;
   - dans « Contexte », les fichiers exacts à lire (pas « lire le projet ») ;
   - les dépendances : le contrat d'abord, seul ; puis les tâches indépendantes en parallèle ;
   - la commande de vérification exacte, limitée au projet ;
   - une taille d'étape : une tâche sur un moteur ou un écran lourd se découpe plus fin (une étape vérifiable
     chacune, comme 1.19d1 et 1.19d2), car un agent qui tourne longtemps coûte cher et perd plus en cas
     d'interruption.
5. **Inscrire** les tâches dans `docs/suivi/travaux.md` (statut ⬜, numéro suivant de la phase en cours), et
   écrire `.claude/lot-en-cours.md` :

   ```markdown
   # Lot en cours

   - Branche : …
   - Objectif : …
   - Relecture : Sonnet | Opus (contrat, sécurité, données sensibles, migration, golden)

   | N°  | Tâche | Agent | Dépend de | Statut | Commit |
   | --- | ----- | ----- | --------- | ------ | ------ |

   ## Fiches

   (une fiche complète par tâche)

   ## Décisions

   ## Dernière vérification
   ```

   Statuts : à faire, en cours (agent lancé), contrôlée, commitée, relue, documentée.

6. **Présenter** le plan à l'utilisateur : un tableau n° · tâche · agent · modèle · dépend de. Attends son accord
   avant de lancer `/livrer` si le plan compte plus de trois tâches ou touche un contrat. Pour un plan de plus de
   trois tâches, conseille `/clear` puis `/livrer` : le plan est dans le fichier d'état.
