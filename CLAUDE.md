@AGENTS.md

# Orchestration Claude Code : Opus, Sonnet, Haiku

Les règles de code sont dans `AGENTS.md` (ci-dessus) ; ce qui suit ne concerne que Claude Code. Principe : **le
bon modèle pour chaque travail**. Opus décide et contrôle, Sonnet construit, Haiku exécute et rapporte. Le
détail, avec des exemples, est dans `docs/demarrer/orchestration.md` ; la décision dans `docs/adr/0007`.

## La session principale est l'orchestrateur

Lancer la session avec Opus (`/model opus`) pour un travail de plus d'une tâche. L'orchestrateur :

1. comprend la demande et la découpe en tâches (skill `/planifier`), inscrites au tableau des travaux ;
2. délègue chaque tâche au bon sous-agent (outil `Agent`, `subagent_type` = nom de l'agent), avec une
   **fiche de tâche** complète (modèle plus bas) : un sous-agent ne voit pas la conversation ;
3. vérifie chaque compte rendu, relance ou escalade, puis fait relire et documenter (skill `/livrer`) ;
4. commite et pousse lui-même, une fois `pnpm check` vert (skill `/cloturer`).

Une petite demande (une question, une correction d'une ligne) se traite directement, sans délégation.

## Répartition

| Agent (`.claude/agents/`) | Modèle | Rôle                                                                                     | Écrit dans                           |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `architecte`              | Opus   | Découpe, conception, contrats, ADR, décisions transverses                                | `contracts/`, `docs/adr/`, plan      |
| `relecteur`               | Opus   | Revue finale d'un changement contre les directives ; ne modifie rien                     | — (rapport)                          |
| `dev-service`             | Sonnet | Implémente une tâche dans un microservice (`services/*`)                                 | `services/<un seul>`                 |
| `dev-moteur`              | Sonnet | Implémente une tâche dans un moteur (`engines/*`, `py/*`)                                | `engines/<un seul>`                  |
| `dev-front`               | Sonnet | Modèles de vue, composants, écrans (`packages/features`, `ui-web`, `viewer3d`, `apps/*`) | le front                             |
| `explorateur`             | Haiku  | Trouve où est quoi, résume du code, lit des journaux ; lecture seule                     | — (rapport)                          |
| `verificateur`            | Haiku  | Lance les vérifications et rapporte les échecs, fichier:ligne ; ne modifie rien          | — (rapport)                          |
| `documentaliste`          | Haiku  | CHANGELOG, tableau des travaux, pages `docs/`, `AGENTS.md` après un changement           | `docs/`, `CHANGELOG.md`, `AGENTS.md` |

Qui fait quoi, par type de travail :

| Travail                                                    | Agent                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| Nouveau contrat ou changement de contrat, nouvel événement | `architecte` (puis les `dev-*`)                            |
| Nouveau service, moteur ou écran                           | `architecte` (ADR + plan) → `dev-*` (générateur puis code) |
| Cas d'usage, adaptateur, tests d'un service                | `dev-service`                                              |
| Algorithme géométrique, patronage, drapé                   | `dev-moteur` ; `architecte` si l'approche est à choisir    |
| Écran, composant, modèle de vue                            | `dev-front`                                                |
| « Où est… ? », « comment marche… ? », lecture de journaux  | `explorateur`                                              |
| Lint, types, tests, construction : lancer et résumer       | `verificateur`                                             |
| Documentation, changelog, statut des travaux               | `documentaliste`                                           |
| Revue avant commit                                         | `relecteur`                                                |

## Escalade

- **Haiku → Sonnet** : une tâche Haiku échoue deux fois, ou demande un jugement (choisir, concevoir, corriger du
  code) : l'orchestrateur la confie à l'agent Sonnet du projet.
- **Sonnet → Opus** : l'orchestrateur reprend la main, ou appelle `architecte`, dès qu'un de ces cas se présente :
  - une tâche touche plus d'un service ;
  - un contrat change de façon incompatible ;
  - la sécurité, les données sensibles, une migration de base ou une référence golden sont en jeu ;
  - `pnpm check` reste rouge après deux allers-retours ;
  - l'agent signale un point ouvert qu'il ne peut pas trancher.
- **Jamais** : un agent Haiku ne modifie du code ; un agent ne sort pas de son périmètre ; aucun agent ne
  commite, ne pousse ni ne modifie `prototype/`, le code généré ou une référence golden sans instruction
  explicite de l'orchestrateur.

## Parallélisme

- Des tâches sur des projets différents, sans contrat commun modifié, partent en parallèle (plusieurs appels
  `Agent` dans le même message) ; pour des écritures simultanées, `isolation: "worktree"`.
- Le contrat se modifie d'abord, seul ; les producteurs et les consommateurs suivent en parallèle.
- La vérification, la relecture et la documentation passent après l'intégration de toutes les tâches.

## Fiche de tâche (à donner en entier au sous-agent)

```markdown
Tâche : <n° du tableau des travaux> — <titre>
Objectif : une phrase, le résultat visible.
Périmètre : projets et fichiers modifiables ; tout le reste est en lecture seule.
Contexte : fichiers, ADR et pages de docs/ à lire d'abord ; décisions déjà prises.
Critères d'acceptation : comportements vérifiables ; chacun devient un test.
Hors périmètre : ce qu'il ne faut pas toucher.
Vérification : commande exacte (ex. pnpm nx run @atelier/designs:test).
Compte rendu attendu : format « Compte rendu » ci-dessous.
```

Chaque sous-agent termine par ce compte rendu, court et factuel, que l'orchestrateur contrôle :

```markdown
## Compte rendu

- Fait : …
- Fichiers modifiés : …
- Tests ajoutés : …
- Vérification : commande lancée et résultat (vert / rouge + extrait)
- Points ouverts : … (ou « aucun »)
```

## Coûts

Opus coûte le plus : il planifie, tranche et relit, mais ne tape pas le code de routine. Sonnet écrit le code.
Haiku absorbe le volume (recherches, vérifications, documentation). Une tâche qu'un agent moins cher peut faire
sûrement lui revient.
