# 0007 — Orchestration Opus, Sonnet, Haiku

**Contexte.** Une grande part du code est écrite avec Claude Code. Un seul modèle pour tout est soit trop cher
(Opus partout), soit trop risqué pour les décisions (un modèle rapide qui découpe un contrat ou traite la
sécurité). Les sous-agents de Claude Code permettent de choisir le modèle par tâche, avec un contexte, des outils
et un périmètre propres.

**Décision.**

- La session principale est l'**orchestrateur**, sur Opus pour un lot de plusieurs tâches : elle planifie,
  délègue, contrôle, commite et pousse. Elle seule commite.
- **Opus** : `architecte` (conception, contrats, ADR) et `relecteur` (revue finale, sans écriture).
- **Sonnet** : `dev-service`, `dev-moteur`, `dev-front`, chacun limité à un projet par tâche.
- **Haiku** : `explorateur` et `verificateur` (lecture seule), `documentaliste` (docs, changelog, tableau des
  travaux).
- Toute délégation passe par une **fiche de tâche** complète et se termine par un **compte rendu** au format
  commun ; les règles d'escalade (Haiku → Sonnet → Opus) sont fixées dans `CLAUDE.md`.
- Le cycle est outillé par trois skills : `/planifier`, `/livrer`, `/cloturer`.
- `.claude/settings.json` autorise les commandes de vérification et interdit les push forcés, le push sur `main`,
  les modifications de `prototype/`, du code généré et des références golden, et la lecture des fichiers `.env`.

**Conséquences.** Le coût se concentre là où une erreur coûte cher (décider, relire). Les fiches demandent un
effort d'écriture à l'orchestrateur, mais rendent chaque tâche rejouable et vérifiable. Les définitions d'agents
se maintiennent comme du code : un changement de directive se reporte dans `.claude/agents/`. Si un modèle
change de nom ou de prix, seule la ligne `model:` des agents concernés change. Tout reste utilisable sans Claude
Code : `AGENTS.md` et les fiches valent aussi pour un humain.

## Amendement du 2026-10-02 : coûts et reprise après interruption

**Contexte.** Mesure de l'usage sur 24 h : toutes les sessions passent par des sous-agents ; 58 % de l'usage se
fait avec plus de 150k de contexte ; environ 40 % vient de la session principale (Opus) ; `architecte` et
`relecteur` (Opus) pèsent 18 %, autant que `dev-moteur` ; une planification est partie dans un sous-agent. Les
sous-agents relisent `AGENTS.md` alors que `CLAUDE.md` le leur fournit déjà, et `engines/drape/AGENTS.md`
(22 Ko) est relu à chaque tâche sur le drapé. Une coupure de connexion ou une limite d'usage fait perdre l'état
d'un lot qui ne vit que dans la conversation, avec une branche pleine de changements non commités.

**Décision** (de l'orchestrateur, sur délégation de l'utilisateur).

- **Contexte court** : une session par lot, `/clear` entre deux lots, `/compact` après chaque tâche commitée ;
  comptes rendus de quinze lignes au plus, sans diff ni journal ; l'orchestrateur fait lire les gros fichiers
  par `explorateur`.
- **Lectures ciblées** : aucun agent ne relit `AGENTS.md` de la racine ; la fiche nomme les fichiers exacts à
  lire ; un `AGENTS.md` de projet reste sous 8 Ko, le détail va dans `docs/composants/`.
- **Moins d'Opus en double** : le découpage reste dans la session principale (`/planifier` jamais dans un
  sous-agent) ; `architecte` sert aux contrats, aux ADR et aux choix d'approche ; `relecteur` passe sur
  **Sonnet**, et sur Opus (`model: "opus"` à l'appel) quand le lot touche un contrat, la sécurité, des données
  sensibles, une migration ou une référence golden.
- **Une fois par lot** : `verificateur`, `relecteur` et `documentaliste` passent une fois, après toutes les
  tâches ; l'agent `dev-*` vérifie son propre projet ; le relecteur ne lit que les fichiers du lot.
- **Règle d'arrêt** des agents `dev-*` : même échec après deux corrections, ou besoin hors périmètre → ils
  s'arrêtent et rendent compte.
- **Reprise** : fichier d'état `.claude/lot-en-cours.md` (ignoré par git) tenu à jour avant et après chaque
  agent ; **commit local par tâche** contrôlée et verte ; avant une limite d'usage, finir l'étape, mettre l'état
  à jour, commiter le vert, ne plus lancer d'agent ; nouveau skill `/reprendre` (état, git, arbres séparés,
  processus orphelins, relance du même agent avec une rubrique « Reprise ») ; jamais de nettoyage de l'arbre de
  travail à l'aveugle.

**Conséquences.** Moins d'Opus et moins de contexte long ; une interruption ne perd au plus que la tâche en
cours. Plus de commits sur la branche (un par tâche), ce qui facilite aussi la relecture. Un relecteur Sonnet
peut laisser passer un défaut subtil : les cas à risque restent sur Opus, et `pnpm check` comme le hook
`pre-push` ne changent pas. À remesurer après quelques lots.
