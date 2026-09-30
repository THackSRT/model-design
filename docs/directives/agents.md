# 10. Développement avec des agents

Un agent de codage travaille bien quand le dépôt lui dit quoi lire, où écrire et s'il a réussi. Trois leviers :
des fichiers de contexte courts et à jour, des tâches bornées, et une vérification automatique rapide.

## Fichiers de contexte

- `AGENTS.md` à la racine : carte du dépôt, commandes, règles d'or, interdits. `CLAUDE.md` inclut
  `@AGENTS.md`, pour que tous les outils lisent le même fichier, et y ajoute l'orchestration propre à Claude Code
  (répartition entre Opus, Sonnet et Haiku) : voir [Orchestration des agents](../demarrer/orchestration.md).
- Un `AGENTS.md` par projet (100 lignes au plus) : rôle, données possédées, événements, commandes, pièges. Il est
  mis à jour dans la demande de fusion qui change ce qu'il décrit ; la section [Composants](../composants/index.md)
  de ce site les affiche directement.
- `docs/adr/` pour les décisions, [langage commun](langage-commun.md) pour les noms.
- Un service et un moteur de référence (`services/designs`, `engines/patterning`) que les générateurs et les
  agents prennent pour modèles.

## Format d'une tâche confiée à un agent

```markdown
Objectif : une phrase, le résultat visible par l'utilisateur.
Périmètre : projets modifiables (ex. services/designs, contracts/openapi/designs.yaml).
Contexte : fichiers et ADR à lire avant de commencer.
Critères d'acceptation : comportements vérifiables ; chacun devient un test.
Hors périmètre : ce qu'il ne faut pas toucher.
Vérification : pnpm check:affected
```

## Façon de travailler

1. Lire le `AGENTS.md` racine et celui du projet visé avant d'écrire une ligne.
2. Créer toute structure nouvelle avec les générateurs (`pnpm gen service|engine|event|screen`), jamais à la main.
3. Suivre l'ordre : contrat, `pnpm contracts:gen`, tests qui échouent, implémentation, tests qui passent.
4. Rester dans le périmètre ; un besoin ailleurs se signale dans la description, il ne se code pas en passant.
5. Livrer de petites demandes de fusion : un seul sujet, environ 400 lignes modifiées au plus hors code généré.
6. Rendre la main seulement quand `pnpm check` passe, avec une description : quoi, pourquoi, comment c'est vérifié.
7. Plusieurs agents en parallèle travaillent chacun sur sa branche et son projet.
8. Mettre à jour la documentation touchée (voir [Rédiger la documentation](../demarrer/documentation.md)).

## Interdits

- Modifier un fichier généré, ou une référence golden, sans instruction explicite.
- Désactiver, sauter ou affaiblir un test ou une règle (`eslint-disable`, `# type: ignore`, `.skip`) sans ADR.
- Importer le code d'un autre service, lire sa base ou modifier ses migrations.
- Ajouter une dépendance sans ADR.
- Écrire un secret, une donnée réelle de client ou une mesure réelle dans le code, les tests ou les journaux.
- Modifier `prototype/`.

## Rendre le dépôt facile à suivre

- Les règles de lint et d'architecture donnent la correction dans leur message.
- Chaque projet expose les mêmes commandes : `lint`, `typecheck`, `test` (et `build`, `dev` quand ils existent).
- Un environnement reproductible démarre en une commande : `pnpm setup`, puis `pnpm stack:up` pour toute la pile.
- `pnpm check:affected` reste rapide (quelques dizaines de secondes) : un retour lent pousse à contourner la
  vérification.
