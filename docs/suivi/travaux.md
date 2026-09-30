# Tableau des travaux

Ce qui est fait, en cours et à faire, en un seul tableau. Une ligne = une livraison dimensionnée pour une demande
de fusion (humain ou agent). On met à jour le statut dans le commit qui livre ; une ligne terminée reste, avec sa
version du [changelog](changelog.md).

**Légende** : ✅ fait · 🟡 en cours · ⬜ à faire · 🔒 bloqué

## Phase 1 — atelier virtuel

Objectif : obtenir les patrons, les modifier et les voir sur un mannequin 2D et 3D.
Porte de sortie : des patrons validés sur toile par un modéliste.

| #    | Travail                                                             | Composant                          | Statut | Version / remarque                          |
| ---- | ------------------------------------------------------------------- | ---------------------------------- | ------ | ------------------------------------------- |
| 1.01 | Monorepo, outillage, frontières d'architecture                      | racine                             | ✅     | 0.1.0                                       |
| 1.02 | Contrats et génération TS / Python                                  | `contracts`, `tools/contracts`     | ✅     | 0.1.0                                       |
| 1.03 | Service de référence `designs` (PostgreSQL, outbox)                 | `services/designs`                 | ✅     | 0.1.0                                       |
| 1.04 | Moteur de référence `patterning` (jupe droite provisoire)           | `engines/patterning`               | ✅     | 0.1.0                                       |
| 1.05 | Moteur mannequin repris du prototype                                | `engines/mannequin`                | ✅     | 0.1.0                                       |
| 1.06 | Studio : mesures, patron 2D, mannequin 3D                           | `apps/studio`                      | ✅     | 0.1.0                                       |
| 1.07 | Générateurs, `AGENTS.md`, ADR                                       | `tools/generators`, `docs`         | ✅     | 0.1.0                                       |
| 1.08 | Conteneurs Docker et pile locale complète                           | `platform`, Dockerfiles            | ✅     | Non publié                                  |
| 1.09 | Documentation MkDocs, changelog, tableau des travaux                | `docs`                             | ✅     | Non publié                                  |
| 1.10 | Vérifications locales (hook `pre-push`), zéro dépense               | racine                             | ✅     | Non publié                                  |
| 1.11 | Intégrer GarmentCode (corsage, jupes, manches, pantalons)           | `engines/patterning`               | ⬜     | Références golden validées par le modéliste |
| 1.12 | Découper le moteur mannequin en modules testés                      | `engines/mannequin`                | ✅     | Non publié                                  |
| 1.13 | Repères de hauteur du mannequin (entrejambe…)                       | `engines/mannequin`                | ⬜     | Reprise de `prototype/js/body.js`           |
| 1.14 | Ajustement du mannequin dans un Web Worker                          | `packages/features`, `apps/studio` | ⬜     | Ne plus figer l'écran                       |
| 1.15 | Vues 2D trait du mannequin (silhouettes SVG)                        | `packages/viewer3d`                | ✅     | Non publié                                  |
| 1.16 | Retouches : paramètres du modèle, liste et comparaison des versions | `services/designs`, `apps/studio`  | ⬜     | `GET /v1/designs/{id}/versions`             |
| 1.17 | Valeurs de couture, crans, gradation, plan de coupe                 | `engines/manufacturing`            | ⬜     | Reprise de `prototype/js/pattern.js`        |
| 1.18 | Exports SVG 1:1, PDF A4 tuilé, DXF-AAMA                             | `engines/manufacturing`            | ⬜     | —                                           |
| 1.19 | Drapé 3D (NVIDIA Warp) en tâche, sortie glTF                        | `engines/drape`                    | ⬜     | Version CPU pour les tests                  |
| 1.20 | Relais de l'outbox vers NATS JetStream                              | `packages/service-kit`             | ✅     | Non publié                                  |
| 1.21 | Storybook et captures comparées                                     | `packages/ui-web`, `apps/studio`   | ⬜     | —                                           |
| 1.22 | Bibliothèque de traduction ICU                                      | `apps/studio`                      | ⬜     | Pluriels, genres                            |
| 1.23 | Chargement différé de three.js                                      | `apps/studio`                      | ⬜     | Paquet de 806 kB aujourd'hui                |
| 1.24 | Tests de bout en bout (Playwright) sur la pile Docker               | `apps/studio`                      | ⬜     | —                                           |
| 1.25 | Porte : toiles d'essai coupées depuis les exports, écarts corrigés  | équipe + modéliste                 | ⬜     | Fin de phase 1                              |
| 1.26 | Orchestration des agents Claude Code (Opus, Sonnet, Haiku)          | `CLAUDE.md`, `.claude/`            | ✅     | Non publié — ADR 0007                       |
| 1.27 | Brancher le relais de l'outbox dans `designs` et déclarer le flux   | `services/designs`, `platform`     | ⬜     | Suite de 1.20                               |
| 1.28 | Afficher les silhouettes 2D dans le studio                          | `apps/studio`                      | ⬜     | Suite de 1.15                               |

## Phases suivantes (à détailler à l'ouverture de chaque phase)

| #    | Travail                                                                         | Phase | Statut |
| ---- | ------------------------------------------------------------------------------- | ----- | ------ |
| 2.01 | Service Identité : connexion par téléphone, jetons internes (fin de l'ADR 0005) | 2     | ⬜     |
| 2.02 | Services Organisations, Clients et mesures, Avatars                             | 2     | ⬜     |
| 2.03 | Commandes, Production, Stock atelier                                            | 2     | ⬜     |
| 2.04 | Paiements mobile money, Messagerie (WhatsApp), Livraison                        | 2     | ⬜     |
| 2.05 | Application mobile (Expo) : modes client et atelier, hors-ligne                 | 2     | ⬜     |
| 2.06 | Hébergement (Kubernetes, Istio ambient) quand un budget existe                  | 2     | ⬜     |
| 3.01 | Communauté, vitrines, publications                                              | 3     | ⬜     |
| 3.02 | Vendeurs de tissus : catalogue, stock, commandes au mètre                       | 3     | ⬜     |
| 3.03 | Sous-traitance (broderie, teinture, impression)                                 | 3     | ⬜     |
| 3.04 | Tissu numérique et vue 2,5D                                                     | 3     | ⬜     |
| 4.01 | Assistant IA de création, mesures par photo                                     | 4     | ⬜     |
| 4.02 | Place de marché, rendus réalistes, prévision des stocks                         | 4     | ⬜     |
