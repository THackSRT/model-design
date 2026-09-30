# Changelog

Les changements visibles de la plateforme, du plus récent au plus ancien. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; les versions suivent les phases du projet
(`0.<phase>.<livraison>`). Chaque demande de fusion qui change un comportement ajoute une ligne sous
**Non publié** ; la section est datée et numérotée à chaque livraison.

## [Non publié]

### Ajouté

- Documentation MkDocs de la plateforme (`pnpm docs:serve`) : architecture, directives de codage, plateforme,
  composants, décisions, tableau des travaux et ce changelog.
- Conteneurs Docker pour chaque moteur, service et application ; pile locale complète avec
  `pnpm stack:up` (studio et passerelle locale sur http://localhost:8080).
- Hook git `pre-push` qui lance `pnpm check:affected` : les vérifications tournent en local (ADR 0006).
- Orchestration Claude Code : huit sous-agents répartis entre Opus, Sonnet et Haiku, skills `/planifier`,
  `/livrer`, `/cloturer` et permissions partagées (`CLAUDE.md`, `.claude/`, ADR 0007).
- Silhouettes 2D du mannequin en `packages/viewer3d` : composant `MannequinOutline` (face, profil, dos) ;
  pas encore affichées.
- Relais générique de l'outbox vers NATS JetStream (`@atelier/service-kit`) : au moins une fois,
  déduplication par `Nats-Msg-Id` (ADR 0008).

### Modifié

- Moteur mannequin remplacé par modules TypeScript testés (geometry, morph, measure, fit, render, pose) ;
  exception au lint levée.
- Mannequin 3D : la tête garde sa forme naturelle (crâne, joues, mâchoire, menton, oreilles) ; seuls les
  traits du visage (yeux, sourcils, nez, bouche) sont effacés, au lieu de la tête ovoïde de vitrine ;
  le visage est aplati (la bouche et le menton ne dépassent plus le plan du front).
- Stockage objet local : SeaweedFS remplace MinIO, qui ne publie plus d'images depuis octobre 2025.
- L'intégration continue GitHub devient facultative (lancement manuel).
- Nx Cloud (offre gratuite) connecté : le cache des tâches est partagé entre les postes.
- L'installation se lance par `pnpm run setup` (`pnpm setup` seul est une commande de pnpm) et installe aussi
  le groupe Python `docs`.
- Licences permises pour les dépendances : l'Unlicense s'ajoute (`tweetnacl`, requise par le client NATS ;
  ADR 0008).

### Corrigé

- `pnpm check` passe sous Windows : fins de ligne LF imposées (`.gitattributes`, ruff), Prettier lancé sans
  `npx` par le générateur de contrats, UTF-8 pour import-linter, chemins `/` dans les générateurs
  (`$ref` des événements), vérification des jetons sans course entre `test` et `typecheck`.

## [0.1.0] — 2026-09-30 — Architecture initiale

### Ajouté

- Monorepo pnpm + Nx et uv ; frontières d'architecture vérifiées (étiquettes Nx, règles par couche, import-linter).
- Contrats d'abord : JSON Schema, OpenAPI, AsyncAPI ; types TypeScript et modèles Pydantic générés
  (`pnpm contracts:gen`), fraîcheur vérifiée.
- Service `designs` (service de référence) : modèles, versions, patrons ; PostgreSQL avec migrations, sécurité
  par lignes et outbox.
- Moteur `patterning` (moteur de référence) : jupe droite provisoire, tests unitaires, de propriétés et golden.
- Moteur `mannequin` : mannequin MakeHuman ajusté aux mesures, repris du prototype.
- Squelettes des moteurs `manufacturing` et `drape`.
- Studio web : saisie des mesures, patron 2D, mannequin 3D ; bibliothèques de jetons, composants, modèles de vue
  et visionneuse 3D.
- Générateurs `pnpm gen service|engine|event|screen`, `AGENTS.md`, ADR 0001 à 0005.

### Modifié

- Le prototype statique d'origine est déplacé dans `prototype/` et figé.

## [0.0.1] — 2026-09-30 — Prototype

### Ajouté

- Prototype statique : croquis du modèle MOD-001, patrons 1:1, plan de coupe, fiche technique, avatar
  paramétrique en 4 vues, recommandation de taille, mannequin réaliste MakeHuman (dossier `prototype/`).
