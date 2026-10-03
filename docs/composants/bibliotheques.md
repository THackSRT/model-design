# Autres bibliothèques et outils

| Projet                   | Rôle                                                                                                                                         | Point d'entrée                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `packages/kernel`        | `Result`, identifiants typés UUID v7, `Money`, longueurs en mm, horloge, `DomainEvent`. Ne dépend de rien.                                   | `src/index.ts`                |
| `packages/contracts-ts`  | Types et schémas JSON générés depuis `contracts/` (`pnpm contracts:gen`).                                                                    | `src/index.ts`                |
| `packages/design-tokens` | Jetons de design (DTCG) compilés par Style Dictionary en variables CSS et en module TS.                                                      | `tokens/*.tokens.json`        |
| `packages/ui-web`        | Composants web accessibles (`Button`, `NumberField`, `Panel`, `Message`, `Tabs`, `TextArea`, `ChoiceGroup`, `FileButton`), jetons seulement. | `src/index.ts`, `src/ui.css`  |
| `packages/viewer3d`      | Visionneuse 3D déclarative (`MannequinView`, three.js caché, vêtement drapé lu par `readDrapedGlb`) et silhouettes 2D (`MannequinOutline`).  | `src/index.ts`                |
| `py/contracts`           | Modèles Pydantic générés depuis `contracts/`.                                                                                                | `atelier_contracts.generated` |
| `py/engine-kit`          | Socle des moteurs : application FastAPI, santé, erreurs RFC 9457, journaux JSON.                                                             | `atelier_engine_kit`          |
| `tools/contracts`        | Génération et contrôle de fraîcheur du code des contrats.                                                                                    | `generate.mjs`                |
| `tools/generators`       | `pnpm gen service\|engine\|event\|screen` et leurs gabarits.                                                                                 | `cli.mjs`, `templates/`       |
