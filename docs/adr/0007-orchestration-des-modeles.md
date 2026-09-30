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
