# Moteur drafting (TypeScript)

Rôle : tracer un patron 2D avec FreeSewing 4.10.2 (Brian pour l'instant), le découper en bords nommés par rôle grâce
à une **fiche de couture**, et contrôler chaque tracé. Entrées : un modèle du catalogue, une taille FreeSewing ou un
`MeasurementSet` (mm), des options (pourcentages en fractions). Sorties : `DraftResult` (pièces, contours, bords,
points), en mm arrondis à 0,001. Temps visé : moins de 10 ms par tracé à chaud (testé).
Décisions : ADR 0019 (FreeSewing derrière une fiche de couture), ADR 0021 (moteur TS, cœur pur, entrées navigateur et
Node), ADR 0024 (`drafting` n'importe aucun moteur, pas même le mannequin : ses mesures lui arrivent complètes).
Modèle à suivre : `engines/drape`.

## Entrées et API

- `src/index.ts` : entrée `.`, compatible navigateur et Worker (aucun `node:*`, aucun DOM ; `test/browser-entry.test.ts`
  et `test/structure.test.ts` le vérifient). `src/node.ts` : `./node`, réexporte `.` (rien de propre à Node pour
  l'instant).
- `draftModel({ model, measurements: { size } | { set }, options? })` rend un `DraftResult` ou lève une `DraftingError`.
  `describeModel(clé)` rend mesures, options réglables (bornes) et pièces ; `MODEL_KEYS`, `SIZE_NAMES` (`cisMaleAdult42` :
  le nombre est le tour de cou en cm), `toFreeSewingMeasurements`, les erreurs typées, `ENGINE_VERSION`,
  `FREESEWING_VERSION` (épinglée, sans `^`).
- Résultat : par pièce (`front`, `back`, `sleeve`), `contour` (sommets nommés, segments ligne ou Bézier cubique avec
  longueurs), `edges` (id, `semanticRole` de GarmentSpec 1.1, sommets, segments, longueur) et `points` publics. Repère de
  FreeSewing : y vers le bas.

## Dossiers

- `src/core/` : calcul pur et déterministe, sur des données simples ; ni E/S, ni `node:*`, ni FreeSewing, ni contrats
  (lint). Contour (`contour.ts`), longueur de Bézier (`curve.ts`, Gauss-Legendre 24 points comme FreeSewing), bords et
  couverture (`edges.ts`), points et noms (`points.ts`), pièce (`part.ts`), options (`options.ts`), erreurs (`errors.ts`),
  fiche (`sheet.ts`), types. **Rien dans `src/core/geometry/` ni `src/geometry.ts`** : l'entrée `./geometry` est la
  tâche 1.57a (ADR 0024).
- `src/sheets/` : une fiche de couture par modèle, **en données** (`brian.ts`).
- `src/spec/` : `MeasurementSet` → mesures FreeSewing (`measurements.ts`, tableau de `docs/composants/contrats.md`).
- `src/adapters/freesewing/` : **seul endroit qui importe FreeSewing** (lint et test). `run.ts` (tracé, journaux),
  `models.ts` (registre : classe, fiche, options qui rendent une mesure obligatoire), `options.ts`, `sizes.ts`, et les
  types minimaux des paquets sans types (`types.ts`, `freesewing-*.d.ts`, branchés par `paths` dans `tsconfig.json`).
- `NOTICE-FREESEWING.md` : avis de licence MIT, livré par `files` de `package.json`.

## Ajouter un modèle (1.56)

Une entrée dans `MODELS` (`adapters/freesewing/models.ts`), sa fiche dans `src/sheets/`, ses types dans `freesewing-*.d.ts`
et un `packageExtensions` si ses paquets importent sans déclarer (`pnpm-workspace.yaml`). Un modèle n'entre au catalogue
que si son banc passe : 5 tailles (femme 28, 34, 40, 46, homme 42) et les bornes de chaque option.

## Contrôles de chaque tracé (rejet par une erreur typée)

Options connues, du bon type et dans leurs bornes (`InvalidOptionError`) ; mesures exigées présentes
(`MissingMeasurementError`, qui les nomme) et utilisables (`InvalidMeasurementError` : plus de 0 et au plus 5 m, pente
d'épaule de 0 à moins de 90° ; FreeSewing met des secondes à ajuster des mesures démesurées, et on ne peut pas
l'interrompre) ; aucune erreur au journal de FreeSewing ni drapeau d'erreur
(`FreeSewingError`) ; contour de couture fermé (`ContourError`) ; chaque bord de la fiche retrouvé
(`EdgeNotFoundError`) ; contour couvert exactement une fois (`CoverageError`). Les avertissements sont rendus.
Messages en anglais, sans valeur de mesure (donnée personnelle).

## Invariants

- **Déterminisme** : mêmes entrées, même version, même sortie (JSON identique). `+ − × ÷` et `Math.sqrt` dans le cœur,
  pas de `Math.hypot` ni de trigonométrie. FreeSewing ne rend pas les mêmes derniers chiffres dans tous les moteurs :
  d'où l'arrondi à 0,001 mm, sans −0.
- Tracé **métrique, sans valeur de couture, sans annotations** (`complete: false` : mêmes points et même contour, un
  quart de temps en moins). FreeSewing reçoit des copies ; rien n'est gardé d'un tracé à l'autre.
- Changer un calcul, c'est changer `ENGINE_VERSION` (0.1.0 : première version) ; monter FreeSewing aussi.
- **Embu : jamais supposé**, il se déclarera dans la fiche (1.55b). Tête de manche ajustée à ± 2 mm seulement par FreeSewing.

## Pièges de FreeSewing connus

- Les erreurs de pièce sont attrapées et journalisées, pas levées ; une mesure absente ne donne qu'un avertissement et un
  tracé faux : les mesures se contrôlent avant. `draftForHighBust` sans `highBust` est ignoré en silence : le moteur
  l'exige.
- `s3Collar` et `s3Armhole` déplacent la couture d'épaule : la fiche s'arrête à `s3ArmholeSplit` et `s3CollarSplit`.
- `Path.join` confond deux points arrondis au même millimètre (`sitsRoughlyOn`) : avec `lengthBonus` presque nul, `cbHem`
  n'est plus un sommet. `vertexCandidates` retombe alors sur le sommet voisin.
- Rares combinaisons d'options qui font échouer une pièce de la bibliothèque (moins de 1 % au hasard) : rejet typé.
- `backWaistLengthMm` part de la cervicale, `hpsToWaistBack` du point d'encolure : on ajoute 5 % du tour de cou
  (`HPS_ABOVE_CERVICALE_RATIO`, le `backNeckCutout` de Brian), à confirmer avec le contrat.

## Tests et commandes

`test/` (Vitest) : unitaires du cœur, Brian sur 5 tailles × options par défaut et des cinq tuniques, bornes de chaque
option, propriétés à graine fixe (pas de `fast-check` au dépôt), erreurs typées, déterminisme, budget (temps de
processeur : le temps mural double sous charge), structure, licence. Pas de référence golden pour l'instant.
`pnpm nx run-many -t lint typecheck test -p @atelier/drafting` ; `…:build`.
