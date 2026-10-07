# Moteur drafting (TypeScript)

Rôle : tracer un patron 2D avec FreeSewing 4.10.2 (Brian pour l'instant), le découper en bords nommés par rôle grâce
à une **fiche de couture**, le contrôler, puis le convertir en **GarmentSpec 1.1**. Entrées : un modèle du catalogue,
une taille FreeSewing ou un `MeasurementSet` (mm), des options (pourcentages en fractions). Sorties : `DraftResult`
(pièces, contours, bords, points), puis `GarmentSpec`, en mm arrondis à 0,001. Temps visé : moins de 10 ms par tracé
à chaud, moins de 5 ms par conversion (testés).
Décisions : ADR 0019 (FreeSewing derrière une fiche de couture), 0021 (moteur TS, cœur pur, entrées navigateur et
Node), 0024 (`drafting` n'importe aucun moteur, pas même le mannequin : ses mesures lui arrivent complètes).
Modèle à suivre : `engines/drape`.

## Entrées et API

- `src/index.ts` : entrée `.`, compatible navigateur et Worker (aucun `node:*`, aucun DOM ; `test/browser-entry.test.ts`
  et `test/structure.test.ts` le vérifient). `src/node.ts` : `./node`, réexporte `.` (rien de propre à Node pour
  l'instant). `src/geometry.ts` : `./geometry`, la géométrie plane (voir « Géométrie plane »).
- `draftModel({ model, measurements: { size } | { set }, options? })` rend un `DraftResult` ou lève une `DraftingError`.
  `toGarmentSpec(draft)` en rend la GarmentSpec 1.1 d'après la fiche du modèle. `describeModel(clé)`, `MODEL_KEYS`,
  `SIZE_NAMES` (`cisMaleAdult42` : tour de cou en cm), `toFreeSewingMeasurements`, les erreurs typées, `ENGINE_VERSION`,
  `FREESEWING_VERSION` (épinglée, sans `^`).
- `DraftResult` : par pièce (`front`, `back`, `sleeve`) `contour` (sommets nommés, segments ligne ou Bézier cubique),
  `edges` (id, `semanticRole`, segments, longueur), `points` ; `values` : valeurs du magasin de FreeSewing que la fiche
  déclare (`library.sleeve.sleevecapTarget`, longueur visée pour la tête de manche).
- **Repère d'une pièce** (`frame` de la fiche) : y vers le bas, x = 0 sur l'axe de la pièce, y = 0 en haut de la pièce de
  base (Brian : `hps` ; la manche, que FreeSewing tient à la ligne de biceps, est translatée au sommet de tête `sleeveTop`).
  La GarmentSpec ne change que le sens de y.

## Dossiers

- `src/core/` : calcul pur et déterministe, sur des données simples ; ni E/S, ni `node:*`, ni FreeSewing, ni contrats
  (lint). Tracé : contour, courbe (longueur de Gauss-Legendre 24 points comme FreeSewing, découpe de Casteljau), bords,
  points, pièce (`part.ts`), options, erreurs, fiche (`sheet.ts`). Patron : pièces droites ou Bézier (`pieces.ts`),
  appariement par fractions (`pairing.ts`), coutures (`seams.ts`), crans (`notches.ts`), pièces (`panels.ts`), assemblage
  (`pattern.ts`). Géométrie plane : `src/core/geometry/` (voir « Géométrie plane »).
- `src/sheets/` : une fiche par modèle, **en données** (`brian.ts`) : bords, repère, pièce de patron (nom, coupe, pose,
  droit fil, crans), coutures (embu, tolérance).
- `src/spec/` : `MeasurementSet` → mesures FreeSewing (`measurements.ts`) ; patron → GarmentSpec (`garment-spec.ts`).
- `src/adapters/freesewing/` : **seul endroit qui importe FreeSewing** (lint et test) : `run.ts` (tracé, journaux, valeurs
  du magasin), `models.ts` (registre), `options.ts`, `sizes.ts`, types minimaux des paquets sans types.
- `NOTICE-FREESEWING.md` : avis de licence MIT, livré par `files` de `package.json`.

## Ajouter un modèle (1.56)

Une entrée dans `MODELS`, sa fiche dans `src/sheets/` (rien de propre au modèle dans le code de conversion), ses types
dans `freesewing-*.d.ts` et un `packageExtensions` si ses paquets importent sans déclarer (`pnpm-workspace.yaml`). Un
modèle n'entre au catalogue que si son banc passe : 5 tailles (femme 28, 34, 40, 46, homme 42), les bornes de chaque
option, et la GarmentSpec valide contre le schéma (`test/garment-spec*.test.ts` est le modèle).

## Géométrie plane (`./geometry`, 1.57a)

`@atelier/drafting/geometry` (`src/geometry.ts`, code dans `src/core/geometry/`) : polylignes et polygones en mm, y vers le
bas, pour `cutting` et `flats` (ADR 0024). **Feuille** : aucun paquet, aucun fichier de `drafting` hors de son dossier
(`test/geometry/entry.test.ts`). Fonctions pures qui ne modifient pas leurs entrées ; `PointMm` (`xMm`, `yMm`) y est redéfini,
identique à celui de `.` ; entrée vide ou argument invalide : `GeometryError`. Noms de l'essai et écarts voulus : en-tête de
`core/geometry/index.ts`. Changer un résultat est un changement transverse (`ENGINE_VERSION` de chaque moteur touché).

## Contrôles

- **Tracé** (erreur typée) : options connues et dans leurs bornes (`InvalidOptionError`) ; mesures exigées présentes et
  utilisables (`MissingMeasurementError`, `InvalidMeasurementError`) ; aucune erreur au journal de FreeSewing
  (`FreeSewingError`) ; contour fermé (`ContourError`) ; chaque bord de la fiche retrouvé (`EdgeNotFoundError`) ; contour
  couvert une fois (`CoverageError`) ; repère et valeurs déclarés présents (`SheetError`). Avertissements rendus.
- **GarmentSpec** : bords en une droite ou une Bézier (coupés aux fractions de longueur où l'autre côté de la couture
  change de pièce : `armhole-3`, `sleeveCap-5`), coutures `<id>-<rang>` ; au plus une couture par bord ; contour fermé,
  trigonométrique, un seul bord de pli droit sur l'axe (`ContourError`, `SheetError`). Chaque couture : longueur de a
  moins celle de b, moins l'**embu déclaré**, à `toleranceMm` près, sinon `SeamError`. Embu : jamais déduit, `{ mm }` ou
  `{ store }` (longueur visée par FreeSewing moins b) ; `easeMm` n'est écrit qu'à partir de 0,5 mm, valeur mesurée par
  paire. Crans : un cran déclaré à un sommet se reporte de l'autre côté à la même fraction de la couture, embu compris.
  Pose : le drapé met au repère le bord le plus proche de l'ancre ; devant et dos s'ancrent au coin d'ourlet (`cfHem`),
  la taille du patron (`cfWaist`) à la taille du corps, décalage tiré du tracé et borné à ± 500 mm ; manche : sommet de
  tête à l'épaule. À valider au premier drapé de Brian.
- Messages en anglais, sans valeur de mesure (donnée personnelle).

## Invariants

- **Déterminisme** : mêmes entrées, même version, même sortie (JSON identique). `+ − × ÷` et `Math.sqrt` dans le cœur,
  pas de `Math.hypot` ni de trigonométrie ; arrondi à 0,001 mm, sans −0.
- Tracé **métrique, sans valeur de couture, sans annotations** (`complete: false`) ; FreeSewing reçoit des copies.
- Changer un calcul, c'est changer `ENGINE_VERSION` (0.2.0 : GarmentSpec, repère de la manche) ; monter FreeSewing aussi.

## Pièges de FreeSewing connus

- Les erreurs de pièce sont journalisées, pas levées ; une mesure absente ne donne qu'un avertissement : les mesures se
  contrôlent avant. `draftForHighBust` sans `highBust` est ignoré en silence : le moteur l'exige.
- `s3Collar` et `s3Armhole` déplacent la couture d'épaule : la fiche s'arrête à `s3ArmholeSplit` et `s3CollarSplit`.
  `s3Collar` sépare les deux épaules (jusqu'à 6,5 mm) : au-delà de ± 2 mm la conversion est rejetée (`SeamError`, 8
  tracés sur 370 aux bornes) ; `s3Armhole` change les emmanchures de la fiche, d'où la cible `sleevecapTarget`.
- Tête de manche ajustée à ± 2 mm seulement de sa cible (arrêt de la boucle de la bibliothèque).
- `lengthBonus` < 0 : aller-retour sur le milieu dos (`mergeCollinear`) ; presque nul : `Path.join` confond deux points.
- Rares combinaisons d'options qui font échouer une pièce de la bibliothèque (moins de 1 %) : rejet typé.
- `backWaistLengthMm` part de la cervicale, `hpsToWaistBack` du point d'encolure : on ajoute 5 % du tour de cou
  (`HPS_ABOVE_CERVICALE_RATIO`), à confirmer avec le contrat.

## Tests et commandes

`test/` (Vitest) : cœur, Brian (5 tailles × 6 jeux d'options, bornes, tirages à graine fixe), GarmentSpec validée par
ajv (`garmentSpecJsonSchema`), vêtement de démonstration sans FreeSewing, erreurs, déterminisme, budgets, structure.
Pas de référence golden. `pnpm nx run-many -t lint typecheck test -p @atelier/drafting` ; `…:build`.
