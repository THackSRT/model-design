@AGENTS.md

# Orchestration Claude Code : Opus, Sonnet, Haiku

Les règles de code sont dans `AGENTS.md` (ci-dessus) ; ce qui suit ne concerne que Claude Code. Principe : **le
bon modèle pour chaque travail**. Opus décide et contrôle, Sonnet construit, Haiku exécute et rapporte. Le
détail, avec des exemples, est dans `docs/demarrer/orchestration.md` ; la décision dans `docs/adr/0007`.

Ce fichier, et donc `AGENTS.md`, est déjà chargé dans le contexte de chaque sous-agent : une fiche ne demande
jamais de le relire.

## La session principale est l'orchestrateur

Lancer la session avec Opus (`/model opus`) pour un travail de plus d'une tâche. L'orchestrateur :

1. comprend la demande et la découpe en tâches (skill `/planifier`, **dans la session principale**, jamais dans un
   sous-agent), inscrites au tableau des travaux et au fichier d'état du lot ;
2. délègue chaque tâche au bon sous-agent (outil `Agent`, `subagent_type` = nom de l'agent), avec une
   **fiche de tâche** complète (modèle plus bas) : un sous-agent ne voit pas la conversation ;
3. contrôle chaque compte rendu, commite la tâche, puis fait vérifier, relire et documenter **une fois par lot**
   (skill `/livrer`) ;
4. pousse lui-même, une fois `pnpm check` vert (skill `/cloturer`).

Une petite demande (une question, une correction d'une ligne) se traite directement, sans délégation.
L'orchestrateur ne lit pas lui-même de gros fichiers ni de longs journaux : il les fait résumer par `explorateur`.

## Répartition

| Agent (`.claude/agents/`) | Modèle | Rôle                                                                                     | Écrit dans                           |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `architecte`              | Opus   | Contrats, ADR, choix d'une approche, décisions transverses                               | `contracts/`, `docs/adr/`            |
| `relecteur`               | Sonnet | Revue d'un lot contre les directives ; ne modifie rien ; Opus pour les cas sensibles     | — (rapport)                          |
| `dev-service`             | Sonnet | Implémente une tâche dans un microservice (`services/*`)                                 | `services/<un seul>`                 |
| `dev-moteur`              | Sonnet | Implémente une tâche dans un moteur (`engines/*`, `py/*`)                                | `engines/<un seul>`                  |
| `dev-front`               | Sonnet | Modèles de vue, composants, écrans (`packages/features`, `ui-web`, `viewer3d`, `apps/*`) | le front                             |
| `explorateur`             | Haiku  | Trouve où est quoi, résume du code, lit des journaux ; lecture seule                     | — (rapport)                          |
| `verificateur`            | Haiku  | Lance les vérifications et rapporte les échecs, fichier:ligne ; ne modifie rien          | — (rapport)                          |
| `documentaliste`          | Haiku  | CHANGELOG, tableau des travaux, pages `docs/`, `AGENTS.md` après un changement           | `docs/`, `CHANGELOG.md`, `AGENTS.md` |

Qui fait quoi, par type de travail :

| Travail                                                    | Agent                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Découpage d'une demande en tâches                          | l'orchestrateur lui-même                                |
| Nouveau contrat ou changement de contrat, nouvel événement | `architecte` (puis les `dev-*`)                         |
| Nouveau service, moteur ou écran                           | `architecte` (ADR) → `dev-*` (générateur puis code)     |
| Cas d'usage, adaptateur, tests d'un service                | `dev-service`                                           |
| Algorithme géométrique, patronage, drapé                   | `dev-moteur` ; `architecte` si l'approche est à choisir |
| Écran, composant, modèle de vue                            | `dev-front`                                             |
| « Où est… ? », « comment marche… ? », lecture de journaux  | `explorateur`                                           |
| Lint, types, tests, construction : lancer et résumer       | `verificateur`                                          |
| Documentation, changelog, statut des travaux               | `documentaliste`                                        |
| Revue avant push                                           | `relecteur` (Sonnet ; `model: "opus"` si cas sensible)  |

`architecte` ne sert pas à découper : l'orchestrateur, déjà sur Opus, le fait. Il est appelé pour écrire un
contrat ou une ADR, ou pour trancher une approche.

`relecteur` passe sur Opus (paramètre `model: "opus"` de l'outil `Agent`) quand le lot touche un contrat, la
sécurité, des données sensibles, une migration de base ou une référence golden.

## Escalade

- **Haiku → Sonnet** : une tâche Haiku échoue deux fois, ou demande un jugement (choisir, concevoir, corriger du
  code) : l'orchestrateur la confie à l'agent Sonnet du projet.
- **Sonnet → Opus** : l'orchestrateur reprend la main, ou appelle `architecte`, dès qu'un de ces cas se présente :
  - une tâche touche plus d'un service ;
  - un contrat change de façon incompatible ;
  - la sécurité, les données sensibles, une migration de base ou une référence golden sont en jeu ;
  - `pnpm check` reste rouge après deux allers-retours ;
  - l'agent s'est arrêté sur sa règle d'arrêt (même échec deux fois) ou signale un point ouvert qu'il ne peut
    pas trancher.
- **Jamais** : un agent Haiku ne modifie du code ; un agent ne sort pas de son périmètre ; aucun agent ne
  commite, ne pousse ni ne modifie `prototype/`, le code généré ou une référence golden sans instruction
  explicite de l'orchestrateur.

## Parallélisme

- Des tâches sur des projets différents, sans contrat commun modifié, partent en parallèle (plusieurs appels
  `Agent` dans le même message) ; pour des écritures simultanées, `isolation: "worktree"`.
- Le contrat se modifie d'abord, seul ; les producteurs et les consommateurs suivent en parallèle.
- La vérification complète, la relecture et la documentation passent une fois, après l'intégration de toutes
  les tâches du lot.

## Contexte et coûts

Le contexte long coûte cher, même en cache, et le plus cher est celui de l'orchestrateur Opus.

- **Une session par lot** : `/clear` entre deux lots ; `/compact` après chaque tâche commitée. L'état du lot
  vit dans `.claude/lot-en-cours.md`, `docs/suivi/travaux.md` et git, pas dans la conversation.
- Pour un lot de plus de trois tâches : `/planifier`, puis `/clear`, puis `/livrer`, qui relit le plan dans le
  fichier d'état.
- **Comptes rendus courts** : quinze lignes au plus, sans diff ni journal collé ; un extrait d'échec tient en
  cinq lignes.
- **Fiche précise** : la rubrique « Contexte » nomme les fichiers exacts à lire ; l'agent ne lit que ceux-là,
  plus le `AGENTS.md` du projet et ce qu'il découvre en codant. Un `AGENTS.md` de projet reste sous 8 Ko : le
  détail fichier par fichier va dans `docs/composants/`.
- **Pas de vérification en double** : l'agent `dev-*` vérifie son projet ; `verificateur` passe une fois par
  lot (`pnpm check:affected`), ou pour diagnostiquer un échec que l'agent n'explique pas.
- Une tâche qu'un agent moins cher peut faire sûrement lui revient. Opus planifie, tranche et relit les cas
  sensibles ; il ne tape pas le code de routine.

## Interruption et reprise

Une session peut s'arrêter à tout moment : coupure de connexion, limite d'usage atteinte, fenêtre fermée,
poste en veille. Le travail doit pouvoir reprendre sans la conversation.

- **Fichier d'état** : `.claude/lot-en-cours.md` (ignoré par git) décrit le lot : branche, objectif, tâches
  avec agent, statut et fiche (ou renvoi au tableau des travaux), décisions prises, dernière vérification.
  L'orchestrateur le met à jour **avant** de lancer un agent et **après** chaque compte rendu.
- **Commit par tâche** : une tâche contrôlée et verte est commitée tout de suite (localement, sans push). Une
  interruption ne perd alors que la tâche en cours.
- **Avant une limite d'usage** (avertissement affiché, lot long) : finir l'étape en cours, mettre le fichier
  d'état à jour, commiter ce qui est vert, ne plus lancer de nouvel agent ni de tâches en parallèle.
- **Reprendre** : session neuve, puis skill `/reprendre` (état du lot, tâche interrompue, arbres séparés,
  processus orphelins). Jamais de nettoyage de l'arbre de travail à l'aveugle.
- **Fiches rejouables** : un agent relancé part de l'état actuel des fichiers, lance d'abord les tests de son
  projet et ne refait pas ce qui est déjà fait et vert.

## Fiche de tâche (à donner en entier au sous-agent)

```markdown
Tâche : <n° du tableau des travaux> — <titre>
Objectif : une phrase, le résultat visible.
Périmètre : projets et fichiers modifiables ; tout le reste est en lecture seule.
Contexte : fichiers exacts, ADR et pages de docs/ à lire ; décisions déjà prises.
Critères d'acceptation : comportements vérifiables ; chacun devient un test.
Hors périmètre : ce qu'il ne faut pas toucher.
Vérification : commande exacte (ex. pnpm nx run @atelier/designs:test).
Reprise : (seulement après une interruption) état trouvé, ce qui reste à faire.
Compte rendu attendu : format « Compte rendu » ci-dessous, quinze lignes au plus.
```

Chaque sous-agent termine par ce compte rendu, court et factuel, que l'orchestrateur contrôle :

```markdown
## Compte rendu

- Fait : …
- Fichiers modifiés : …
- Tests ajoutés : …
- Vérification : commande lancée et résultat (vert / rouge + extrait de cinq lignes au plus)
- Points ouverts : … (ou « aucun »)
```
