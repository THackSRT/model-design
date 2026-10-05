# Lot 7 — fiches des tâches

Fiches des tâches 1.54a à 1.61b du lot 7 (fondations 2D : contrats et moteurs), au format de `CLAUDE.md`. Chaque fiche
se donne en entier au sous-agent, qui ne voit pas la conversation. Le statut des tâches est tenu dans le
[tableau des travaux](travaux.md) ; l'ordre et les dépendances, dans le [plan d'action](plan-action-plateforme.md). Les
sources figées des essais, dans `docs/suivi/essais/`, servent de référence et ne sont jamais modifiées.

Chaque sous-agent termine par le compte rendu de `CLAUDE.md` (fait, fichiers modifiés, tests ajoutés, vérification,
points ouverts), quinze lignes au plus.

## 1.54a — Contrats : MeasurementSet (+9) et GarmentSpec 1.1

- **Tâche** : 1.54a — Contrats : MeasurementSet reçoit les mesures FreeSewing manquantes ; GarmentSpec 1.1.
- **Objectif** : les neuf mesures FreeSewing manquantes existent dans `MeasurementSet` (facultatives) et GarmentSpec
  passe en 1.1 par élargissement compatible ; types TypeScript et Python régénérés ; tous les consommateurs restent
  verts.
- **Périmètre** : `contracts/schemas/measurement-set.schema.json`, `contracts/schemas/garment-spec.schema.json`, code
  généré par `pnpm contracts:gen` (jamais à la main), `docs/composants/contrats.md` (correspondance des mesures et
  rôles), `docs/directives/langage-commun.md` (nouveaux termes). Tout le reste en lecture seule.
- **Contexte** : `contracts/README.md` (versions, compatibilité) ; `docs/adr/0002-contrats-d-abord.md` ;
  `docs/adr/0019-trace-freesewing.md` (liste des neuf mesures : `hips` haut de hanches, `waistBack`, `seatBack`,
  `shoulderSlope`, `waistToArmpit`, `waistToHips`, `crossSeam`, `crossSeamFront`, `waistToUpperLeg`) ;
  `docs/adr/0020-document-de-modele-et-operations.md` (GarmentSpec 1.1) ; `contracts/schemas/garment-spec.schema.json` ;
  `contracts/schemas/measurement-set.schema.json` ; `tools/contracts/generate.mjs` ;
  `docs/suivi/essais/freesewing/mesures.mjs` (correspondance d'essai entre mesures) ;
  `docs/suivi/essais/freesewing/lib/to-spec.mjs` (conversion d'essai en GarmentSpec 1.0) ;
  `docs/suivi/essais/tuniques/cut.mjs` (marques de pose et crans utilisés par l'essai).
- **Décisions déjà prises** :
  - Mesures en mm avec le suffixe `Mm`, l'angle d'épaule en degrés avec le suffixe `Deg` ; toutes facultatives
    (élargissement compatible, pas de nouvelle version d'URL). Le `hips` de FreeSewing (haut de hanches) est distinct de
    `hipGirthMm` : la correspondance complète MeasurementSet ↔ FreeSewing est écrite dans `docs/composants/contrats.md`.
  - GarmentSpec : le `role` structurel des bords ne change pas ; s'ajoutent en champs facultatifs le rôle sémantique
    d'un bord (encolure, épaule, emmanchure, côté, ourlet, milieu devant, milieu dos, tête de manche, dessous de bras,
    taille, entrejambe, côté extérieur…), la matière d'un panneau (clé d'une table de matières facultative), les marques
    de pose d'un panneau (ligne, contour, bouton, fente, zone) et, si besoin, des précisions sur les crans ;
    `specVersion` accepte "1.0" et "1.1".
  - Les consommateurs (`engines/drape`, `engines/mannequin`, `services/designs`, `packages/features`, `apps/studio`) ne
    sont pas modifiés. Si l'un d'eux ne compile plus, s'arrêter et le signaler en point ouvert.
- **Critères d'acceptation** :
  - Les GarmentSpec de référence de `engines/patterning/tests/golden/*.json` restent valides ; un exemple 1.1 utilisant
    tous les nouveaux champs est valide (test là où le dépôt teste déjà les schémas).
  - `pnpm contracts:gen` régénère TypeScript et Python ; `pnpm contracts:check` est vert.
  - La correspondance des mesures (existantes et nouvelles) vers les noms FreeSewing est un tableau dans
    `docs/composants/contrats.md` ; les nouveaux termes sont dans le langage commun.
- **Hors périmètre** : document de modèle (1.54b), tout code de moteur ou de service, références golden.
- **Vérification** : `pnpm contracts:gen && pnpm contracts:check && pnpm check:affected`.
- **Compte rendu attendu** : format « Compte rendu » de `CLAUDE.md`, quinze lignes au plus.

## 1.54c — Générateur de moteur TypeScript

- **Tâche** : 1.54c — `pnpm gen engine <nom>` crée un moteur TypeScript ; le gabarit Python est retiré.
- **Objectif** : un nouveau moteur TypeScript se crée par le générateur, sur le modèle de `engines/drape`, comme l'exige
  `AGENTS.md` (« toute structure nouvelle vient d'un générateur »).
- **Périmètre** : `tools/generators/**` seulement (cli, générateurs, gabarits `templates/engine/`, tests). Exception de
  périmètre accordée par l'orchestrateur pour cette tâche ; la documentation (`docs/directives/recettes.md`,
  `docs/demarrer/conteneurs.md`) est mise à jour en fin de lot par le documentaliste.
- **Contexte** : `tools/generators/cli.mjs`, `tools/generators/generators.mjs` (générateur `engine`),
  `tools/generators/templates/engine/` (gabarit Python actuel), `tools/generators/generators.test.ts` ; modèle à suivre
  : `engines/drape/package.json`, `engines/drape/tsconfig.json`, `engines/drape/tsconfig.build.json`,
  `engines/drape/eslint.config.mjs`, `engines/drape/vitest.config.ts`, `engines/drape/src/index.ts`,
  `engines/drape/src/node.ts`, `engines/drape/src/version.ts` ; `docs/adr/0021-studio-local-et-refonte-des-moteurs.md`
  (cœur sans DOM ni `node:*`, une entrée navigateur ou Worker et une entrée Node, `ENGINE_VERSION`, références golden).
- **Décisions déjà prises** :
  - Le moteur généré : paquet `@atelier/<nom>`, `type: module`, exports `.` (cœur, navigateur et Worker) et `./node`,
    tag Nx `type:engine`, `src/core/` pur (règle eslint `no-restricted-imports` sur `node:*` et les adaptateurs, comme
    drape), `src/version.ts` avec `ENGINE_VERSION = '0.1.0'`, un test d'exemple vitest, un `AGENTS.md` court, pas de
    Dockerfile (ces moteurs ne sont pas des services).
  - Le générateur inscrit `engines/<nom>` dans `pnpm-workspace.yaml`, dont la liste des moteurs est explicite (les
    moteurs Python vivent aussi sous `engines/`), comme le générateur Python inscrivait le moteur dans `pyproject.toml`.
  - Le gabarit Python disparaît (ADR 0021 gèle Python) ; les moteurs Python existants ne bougent pas.
- **Critères d'acceptation** :
  - Le test du générateur vérifie les fichiers produits, le remplacement des noms et l'inscription dans
    `pnpm-workspace.yaml`.
  - Essai à blanc : `pnpm gen engine essai-gabarit`, `pnpm install`, puis lint, typecheck et test verts sur
    `@atelier/essai-gabarit` ; le moteur d'essai est ensuite supprimé (rien ne reste, verrou compris).
- **Hors périmètre** : création de `drafting`, `cutting`, `flats` (tâches suivantes).
- **Vérification** : `pnpm nx run @atelier/generators:test`, puis l'essai à blanc ci-dessus.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.54d — ADR 0024 : dépendances des moteurs TypeScript

- **Tâche** : 1.54d — ADR 0024 : dépendances entre moteurs TypeScript, et moteurs appelés par un service.
- **Objectif** : les dépendances que le lot 7 crée sont décidées et écrites avant le code : `cutting` et `flats`
  utilisent `drafting`, `flats` utilise `cutting`, `designs` appelle `drafting` et `cutting` sous Node ; la règle des
  frontières entre projets (`@nx/enforce-module-boundaries`) sait les accepter.
- **Périmètre** : `docs/adr/0024-dependances-des-moteurs-typescript.md` (nouvelle), `docs/adr/index.md`, `mkdocs.yml`
  (navigation des ADR) et, par exception accordée pour cette tâche, le commentaire de `DEP_CONSTRAINTS` dans
  `eslint.config.mjs` (racine), qui annonce aujourd'hui « la seule exception est celle de engines/drape ».
- **Contexte** : `eslint.config.mjs` (racine : un moteur ne dépend que du noyau et des contrats ; un service, du noyau,
  du `service-kit` et des contrats) ; `engines/drape/eslint.config.mjs` (exception étroite, ADR 0013) ;
  `docs/adr/0013-drape-physique.md` ; `docs/adr/0021-studio-local-et-refonte-des-moteurs.md` (moteurs dans le navigateur
  et sous Node ; `designs` valide et exporte sous Node) ; `docs/adr/0020-document-de-modele-et-operations.md` ;
  `docs/suivi/plan-action-plateforme.md` (lot 7) ; `docs/suivi/lot-7.md` (fiches qui créent les dépendances : 1.57a,
  1.58a, 1.58e, 1.59a, 1.59b, 1.60b, 1.60c).
- **Décisions déjà prises** (à confirmer ou amender dans l'ADR, avec leurs raisons et les solutions écartées) :
  - La géométrie plane vit dans `drafting` et s'exporte en `@atelier/drafting/geometry`, sans nouveau paquet ni nouveau
    tag ; solution à examiner et à écarter ou retenir : un paquet partagé de géométrie.
  - Chaîne sans cycle : `drafting` ← `cutting` (géométrie ; rejeu du document dans les seuls tests de la porte J1) ←
    `flats` (état rejoué et géométrie de `drafting`, pièces de `cutting` pour les planches).
  - `designs` n'importe un moteur que dans `src/adapters/engines/` ; le domaine reste derrière son port.
  - Chaque exception est étroite et déclarée dans l'`eslint.config.mjs` du projet qui en a besoin, comme
    `engines/drape` ; la tâche qui crée la dépendance la pose, en citant l'ADR 0024.
- **Critères d'acceptation** : ADR 0024 au format des ADR du dépôt (contexte, décision, conséquences, solutions
  écartées), inscrite dans l'index et la navigation ; commentaire racine à jour ; `pnpm check:affected` vert,
  documentation comprise. Si l'ADR s'écarte des décisions ci-dessus, le compte rendu le dit : l'orchestrateur met alors
  les fiches concernées à jour.
- **Hors périmètre** : code des moteurs et du service ; les exceptions elles-mêmes (posées par les tâches qui créent les
  dépendances).
- **Vérification** : `pnpm check:affected`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.54b — Contrats : document de modèle et opérations

- **Tâche** : 1.54b — Schémas `design-document` et `design-operation`, documents de référence.
- **Objectif** : le document de modèle (base du catalogue, mesures, matières, opérations) et l'union de ses opérations
  ont un contrat, avec des descriptions en français ; six documents de référence valides servent de jeux d'essai aux
  moteurs.
- **Périmètre** : `contracts/schemas/designs/design-document.schema.json`,
  `contracts/schemas/designs/design-operation.schema.json` (ou un sous-dossier d'opérations, selon
  `contracts/README.md`), `contracts/examples/design-documents/` (nouveau, décrit dans `contracts/README.md`), code
  généré, `docs/composants/contrats.md`, `docs/directives/langage-commun.md`.
- **Contexte** : `docs/adr/0020-document-de-modele-et-operations.md` ; `docs/adr/0023-preparation-ia.md` (les schémas
  d'opération sont aussi les outils de l'assistant : descriptions obligatoires) ;
  `docs/suivi/essais/tuniques/garments.mjs` (les cinq tuniques en données) ; `docs/suivi/essais/tuniques/ops.mjs`
  (paramètres et valeurs par défaut de chaque opération) ; `contracts/schemas/designs/design-version.schema.json`,
  `contracts/schemas/designs/design.schema.json` ; `contracts/README.md`.
- **Décisions déjà prises** :
  - Document : version de document "1.0" ; base = clé du catalogue (`brian`, `teagan`, `titan`, `sandy`, `bella`,
    `straight-skirt`), version de FreeSewing ("4.10.2") et options (fractions, comme FreeSewing) ; mesures = taille d'un
    tableau ou `MeasurementSet` ; table de matières (clé → nom, genre : uni, bogolan, géométrique, tissage, rayure,
    vichy, galon rayé, galon grecque, broderie ; couleurs) ; liste ordonnée d'opérations.
  - Opération : champs communs `id` (unique dans le document), `op` (discriminant), `enabled` (vrai par défaut ; faux =
    masquée, gardée mais non rejouée). Longueurs en mm. Chemin = points ancrés (bord + x, y ou fraction ; repère +
    décalage ; ou coordonnées) avec `smooth`. Opérations : encolure (ronde ou V), fente d'encolure, longueur de manche,
    poignet, bande rapportée, découpe (soit `preset` u, pointe, carré, empiècement avec profondeur et départ sur
    l'épaule, soit `path` libre avec prolongement ; partie retenue = repère ou « la plus petite »), patte, poche, galon,
    broderie, fentes de côté, déformation d'ourlet (évasement, arrondi).
  - Les longueur et aisance générales sont des options de la base, pas des opérations.
  - Mesures complètes pour la base : `drafting` n'importe aucun moteur et `designs` ne déduit rien (ADR 0024) ; le
    mannequin complète les mesures dans le studio avant l'enregistrement.
  - Sécurité (ADR 0024) : le document est une entrée non sûre, rejouée par `designs` sous Node ; le schéma borne le
    nombre d'opérations, de points d'un chemin, de matières et la longueur des textes.
- **Critères d'acceptation** :
  - Six documents valides dans `contracts/examples/design-documents/` : tunique neutre (Brian, toile écrue, aucune
    opération) et les cinq tuniques de l'essai converties de `garments.mjs` ; un test les valide contre le schéma.
  - Un document invalide (opération inconnue, paramètre hors bornes, identifiant en double, bornes de taille
    dépassées) est refusé avec un message clair (test).
  - `pnpm contracts:check` vert ; chaque opération et chaque paramètre a une description en français.
- **Hors périmètre** : OpenAPI de `designs` (1.60a), implémentation des opérations (1.57), GarmentSpec (1.54a).
- **Vérification** : `pnpm contracts:gen && pnpm contracts:check && pnpm check:affected`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.54e — Contrat de fabrication : matière, marques de pose et plan par matière

Tâche ajoutée le 4 octobre après l'ADR 0024 : le contrat `CutPattern` porte les crans mais pas les marques de pose
qu'exige 1.58a, et `CuttingPlan` ne connaît qu'une laize, alors que les tuniques se coupent dans deux matières.

- **Tâche** : 1.54e — Les pièces de coupe portent leur matière et leurs marques de pose ; un plan de coupe par matière.
- **Objectif** : le contrat de fabrication accepte, par élargissement compatible, ce que `cutting` produira à partir
  d'une GarmentSpec 1.1 (matière et marques de pose de chaque pièce, pièce au pli dépliée, plan et métrage par
  matière), et tout ce que produit `manufacturing` aujourd'hui reste valide et identique.
- **Périmètre** : `contracts/schemas/manufacturing/*.schema.json`, code généré par `pnpm contracts:gen`,
  `docs/composants/contrats.md`, `docs/directives/langage-commun.md` (nouveaux termes).
- **Contexte** : `docs/adr/0024-dependances-des-moteurs-typescript.md` ; `docs/adr/0009-moteur-de-fabrication.md` ;
  `docs/adr/0012-fabrication-via-designs.md` ; `contracts/README.md` ; `contracts/schemas/manufacturing/` (surtout
  `cut-pattern`, `cutting-plan`, `cutting-plan-request`, `cut-pattern-request`, `export-request`) ;
  `contracts/schemas/garment-spec.schema.json` (1.1 : matières, marques de pose, rôles sémantiques, d'après 1.54a) ;
  `engines/manufacturing/tests/golden/straight-skirt-cut-pattern.json` ; `docs/suivi/essais/tuniques/cut.mjs` (marques
  par pièce, dépliage) ; `docs/suivi/essais/tuniques/marker.mjs` et `metrage.json` (plan et métrage par matière).
- **Décisions déjà prises** :
  - Champs facultatifs seulement, pas de nouvelle version d'URL ; une pièce sans matière ni marque garde exactement ses
    champs actuels (parité de 1.58a avec la jupe droite, champs et ordre compris).
  - Les marques de pose d'une pièce reprennent les genres de la GarmentSpec 1.1 (ligne, contour, bouton, fente, zone),
    en coordonnées de la pièce coupée ; la matière est la clé de la table des matières de la GarmentSpec.
  - Un plan de coupe par matière : clé de matière facultative sur le plan, et une laize par matière dans la requête ;
    le métrage conseillé (marge de 10 cm, arrondi au décimètre) figure sur le plan s'il n'y est pas déjà.
- **Critères d'acceptation** : la référence de la jupe droite reste valide ; une pièce avec matière, marques et
  dépliage, et deux plans de deux matières sont valides (test là où le dépôt teste déjà les schémas) ; descriptions en
  français ; `pnpm contracts:check` vert ; `engines/manufacturing` reste vert sans modification.
- **Hors périmètre** : code de `cutting` (1.58) et de `manufacturing` ; OpenAPI de `designs` (1.60a, qui suit).
- **Vérification** : `pnpm contracts:gen && pnpm contracts:check && pnpm check:affected`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.55a — `drafting` : adaptateur FreeSewing et fiche de Brian

- **Tâche** : 1.55a — Moteur `@atelier/drafting`, tracé de Brian par FreeSewing 4.10.2, fiche de couture, contrôles.
- **Objectif** : `engines/drafting` (créé par `pnpm gen engine drafting`) trace Brian à partir d'un `MeasurementSet` ou
  d'une taille et d'options, découpe le contour en bords nommés par rôle grâce à une fiche de couture, et contrôle
  chaque tracé.
- **Périmètre** : `engines/drafting/**` ; `package.json` racine ou `pnpm-workspace.yaml` pour les `packageExtensions`
  pnpm des imports non déclarés de FreeSewing ; `pnpm-lock.yaml` par `pnpm install`.
- **Contexte** : `docs/adr/0019-trace-freesewing.md` (décision, contrôles, installation) ;
  `docs/adr/0021-studio-local-et-refonte-des-moteurs.md` (règles des moteurs TS) ; `docs/suivi/essai-freesewing.md`
  (défauts connus : imports non déclarés, embu implicite) ; `docs/suivi/essais/freesewing/lib/adapter.mjs` (découpe du
  contour, noms de sommets, résolution de fiche, tolérances) ; `docs/suivi/essais/freesewing/lib/designs.mjs` ;
  `docs/suivi/essais/freesewing/mesures.mjs` ; `docs/suivi/essais/tuniques/base.mjs` (fiche de Brian : plages de points
  nommés → rôle) ; `docs/composants/contrats.md` (correspondance des mesures, après 1.54a) ;
  `engines/drape/src/index.ts`, `engines/drape/src/node.ts` (forme des entrées).
- **Décisions déjà prises** : FreeSewing 4.10.2 exact (sans `^`) : `@freesewing/core`, `@freesewing/brian`, et
  `@freesewing/models` (tableaux de tailles) ; tracé métrique, sans valeur de couture ; sorties arrondies à 0,001 mm ;
  seul l'adaptateur importe FreeSewing ; une fiche de couture est une donnée par modèle ; cœur sans `node:*` ni DOM ;
  avis de licence MIT de FreeSewing livré avec le moteur.
- **Critères d'acceptation** :
  - Brian tracé sur les cinq tailles de validation de l'essai (`VALIDATION_SIZES` de
    `docs/suivi/essais/freesewing/lib/scenarios.mjs` : femme 28, 34, 40, 46 et homme 42 ; FreeSewing nomme ses tailles
    par le tour de cou en cm), avec les options par défaut et les options de base des cinq tuniques (`base` dans
    `docs/suivi/essais/tuniques/garments.mjs`) : 0 erreur, tous les bords de la fiche résolus, contour couvert, sommets
    nommés.
  - Rejet par une erreur typée et lisible si FreeSewing journalise une erreur ou si un bord de fiche est introuvable.
  - Deux tracés identiques donnent la même sortie ; moins de 10 ms par tracé à chaud (médiane sur 20).
- **Hors périmètre** : GarmentSpec (1.55b), autres modèles (1.56), opérations (1.57).
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.61a — Mannequin : mesures FreeSewing déduites et repères

- **Tâche** : 1.61a — Le mannequin fournit les mesures FreeSewing manquantes et de nouveaux repères.
- **Objectif** : à partir du corps ajusté, le mannequin déduit les onze nouvelles mesures de `MeasurementSet` (les neuf
  de l'ADR 0019, plus `highBustGirthMm` et `kneeHeightMm`, ajoutées par 1.54a pour Bella et Titan) quand elles manquent, et expose les repères point d'encolure (côté du cou), acromion, aisselle et crête iliaque, à gauche et
  à droite, en mm.
- **Périmètre** : `engines/mannequin/**`.
- **Contexte** : `engines/mannequin/src/index.ts` (`fit`, `LandmarksMm`, `toMakeHumanMeasures`),
  `engines/mannequin/src/core/regions.ts` (zones de mesure), `engines/mannequin/test/landmarks.test.ts`,
  `engines/mannequin/test/measure.test.ts`, `engines/mannequin/test/characterization.test.ts` (empreinte figée) ;
  `contracts/schemas/measurement-set.schema.json` (après 1.54a) ; `docs/composants/contrats.md` (correspondance) ;
  `docs/adr/0019-trace-freesewing.md` ; `docs/adr/0018-bras-a-l-horizontale.md` ; `docs/composants/mannequin.md`.
- **Décisions déjà prises** : le maillage et l'ajustement ne changent pas (l'empreinte du test de caractérisation reste
  identique) ; les mesures fournies par l'utilisateur priment toujours sur les mesures déduites.
- **Critères d'acceptation** :
  - Sur des tailles homme et femme du tableau FreeSewing (nommées par le tour de cou en cm), converties en
    `MeasurementSet` comme dans `docs/suivi/essais/tuniques/drape-run.mjs` et recopiées en fixture de test avec leur
    source (aucune dépendance nouvelle du mannequin), les mesures déduites restent dans une tolérance écrite et
    justifiée dans le test.
  - Repères testés : symétrie gauche et droite, ordre vertical (crête iliaque sous l'aisselle, sous l'acromion).
- **Hors périmètre** : parties du corps (1.61b), drapé.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/mannequin`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.55b — `drafting` : conversion en GarmentSpec 1.1

- **Tâche** : 1.55b — La base tracée devient une GarmentSpec 1.1 valide.
- **Objectif** : panneaux (devant et dos au pli, manche en paire), bords avec rôles structurel et sémantique, coutures
  appariées dans la tolérance, crans, embu de tête de manche déclaré dans la fiche, placement autour du corps.
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/suivi/essais/freesewing/lib/to-spec.mjs` (conversion d'essai conforme à GarmentSpec 1.0) ;
  `docs/suivi/essais/tuniques/spec3d.mjs` (GarmentSpec d'une tunique pour le drapé, conventions de placement) ;
  `contracts/schemas/garment-spec.schema.json` (1.1) ;
  `engines/patterning/tests/golden/bodice-with-sleeves-reference.json` (GarmentSpec de référence) ;
  `docs/adr/0019-trace-freesewing.md` (contrôles, embu).
- **Décisions déjà prises** : repère des pièces y vers le bas, y = 0 en haut de la pièce de base, la manche de
  FreeSewing translatée (`docs/composants/contrats.md`, 1.54b) ; l'embu se déclare dans la fiche, il ne se suppose jamais (taille 42 : tête de manche 616,2
  mm pour 617,8 mm d'emmanchures d'après l'essai) ; même conventions de placement que le corsage à manches de référence.
- **Critères d'acceptation** : GarmentSpec de Brian valide contre le schéma (test ajv) sur les tailles et les six jeux
  d'options de 1.55a ; écarts de longueur des coutures dans la tolérance ou embu déclaré ; tests.
- **Hors périmètre** : `engines/drape` (aucune modification), opérations.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.57a — `drafting` : géométrie plane

- **Tâche** : 1.57a — Module de géométrie pure, exporté pour `cutting` et `flats`.
- **Objectif** : polylignes en mm (y vers le bas) : point, longueur, abscisse curviligne, portion, rééchantillonnage,
  décalage, décalage de polygone avec onglets limités, décalage à largeur variable par segment, lissage (Catmull-Rom,
  Bézier cubique échantillonnée), intersections, découpe d'un polygone par une polyligne, point dans un polygone, boîte
  englobante, aire signée ; export `@atelier/drafting/geometry` (emplacement fixé par
  `docs/adr/0024-dependances-des-moteurs-typescript.md`, tâche 1.54d).
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/suivi/essais/tuniques/geom.mjs` (toutes ces fonctions, à reprendre proprement en TypeScript) ;
  `docs/suivi/essais/tuniques/cut.mjs` (`offsetVar`) ; `eslint.config.mjs` racine (40 lignes par fonction, complexité 10) ; `docs/adr/0024-dependances-des-moteurs-typescript.md`.
- **Décisions déjà prises** (ADR 0024) : code dans `src/core/geometry/`, entrée `src/geometry.ts`, export `"./geometry"`
  avec les conditions `source`, `types` et `default` comme `.` et `./node` ; l'entrée est une feuille : elle n'atteint
  aucun paquet (ni FreeSewing, ni `@atelier/*`, ni `node:*`) ni aucun fichier de `drafting` hors de
  `src/core/geometry/`.
- **Critères d'acceptation** : chaque fonction testée ; tests de propriétés : la découpe d'un polygone par une ligne qui
  le traverse donne deux polygones dont la somme des aires vaut l'aire initiale (1e-6 près) ; `pointAt(length)` donne le
  dernier point ; aucun import `node:*` ni DOM ; un test sur le modèle de `test/browser-entry.test.ts` prouve que
  l'entrée `./geometry` est une feuille.
- **Hors périmètre** : opérations.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.60a — Contrat de `designs` : versions du document et exports à la demande

- **Tâche** : 1.60a — OpenAPI de `designs` pour les versions portant un document de modèle.
- **Objectif** : une version de modèle peut porter un document de modèle ; les exports (pièces, plan de coupe, PDF, DXF,
  SVG) d'une telle version sont calculés à la demande par les moteurs TypeScript sous Node ; les routes actuelles
  restent compatibles (ADR 0014).
- **Périmètre** : `contracts/openapi/designs.yaml`, `contracts/schemas/designs/*.json`, code généré,
  `docs/composants/designs.md`, une ADR si une décision nouvelle apparaît.
- **Contexte** : `contracts/openapi/designs.yaml` ; `contracts/schemas/designs/` ; `contracts/schemas/manufacturing/`
  (matière, marques de pose et plan par matière depuis 1.54e) ; `docs/adr/0024-dependances-des-moteurs-typescript.md` ;
  `docs/adr/0012-fabrication-via-designs.md` ; `docs/adr/0014-versions-et-erreurs-relayees.md` ;
  `docs/adr/0020-document-de-modele-et-operations.md` ; `docs/adr/0021-studio-local-et-refonte-des-moteurs.md` ;
  `docs/composants/designs.md`.
- **Décisions déjà prises** : la GarmentSpec reste une donnée dérivée, recalculée ou mise en cache par empreinte du
  document et des versions des moteurs ; les anciennes routes (création par paramètres relayée au patronage Python)
  restent jusqu'au retrait des moteurs Python (lot 11).
- **Critères d'acceptation** : contrat valide, types générés, aucune rupture des routes existantes,
  `pnpm check:affected` vert.
- **Hors périmètre** : code du service (1.60b, 1.60c).
- **Vérification** : `pnpm contracts:gen && pnpm contracts:check && pnpm check:affected`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.61b — Mannequin : parties du corps

- **Tâche** : 1.61b — Une étiquette de partie du corps par sommet du maillage.
- **Objectif** : tête, cou, torse, bras gauche et droit, mains, jambes, pieds sont étiquetés sur le maillage et exposés
  avec lui, pour les collisions par partie du drapé (lot 9, tâche 1.72).
- **Périmètre** : `engines/mannequin/**`.
- **Contexte** : `engines/mannequin/src/core/` (maillage et groupes MakeHuman), `engines/mannequin/src/core/regions.ts`,
  `engines/mannequin/src/index.ts` ; pour l'usage futur seulement (ne pas modifier) :
  `engines/drape/src/core/inside.ts`, `engines/drape/src/core/body-query.ts`, `docs/suivi/essai-tuniques.md`
  (pénétration sous l'aisselle droite).
- **Décisions déjà prises** : l'étiquetage ne change ni le maillage ni l'empreinte de caractérisation.
- **Critères d'acceptation** : chaque sommet a une étiquette ; chaque partie est d'un seul tenant ; sous l'aisselle, les
  sommets du bras ne sont pas étiquetés torse (cas de la tâche 1.72) ; tests.
- **Hors périmètre** : drapé.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/mannequin`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.56a — Catalogue 1 : Teagan, Titan et banc de validation

- **Tâche** : 1.56a — Fiches de Teagan (tee-shirt) et Titan (pantalon) ; banc de validation des fiches.
- **Objectif** : les deux modèles entrent au catalogue ; un banc par modèle (cinq tailles, bornes des options) prouve
  que chaque tracé passe les contrôles, en moins de 15 s par modèle, dans les tests du moteur.
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/suivi/essais/freesewing/fiches/teagan.json`, `docs/suivi/essais/freesewing/fiches/titan.json` ;
  `docs/suivi/essais/freesewing/make-fiches.mjs` ; `docs/suivi/essais/freesewing/lib/scenarios.mjs`,
  `docs/suivi/essais/freesewing/lib/bench-lib.mjs` (scénarios d'options) ; `docs/suivi/essai-freesewing.md` (résultats
  et défauts par modèle) ; `docs/adr/0019-trace-freesewing.md` (un modèle n'entre au catalogue que si son banc passe) ;
  `docs/composants/contrats.md` (correspondance des mesures : `waistToKnee` = `waistHeightMm` − `kneeHeightMm` pour
  Titan).
- **Critères d'acceptation** : banc vert pour Teagan et Titan (combinaisons sans erreur, ou combinaisons interdites
  listées et refusées proprement) ; GarmentSpec valides ; moins de 15 s par modèle.
- **Hors périmètre** : autres modèles.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.58a — `cutting` : pièces de coupe, crans, parité golden

- **Tâche** : 1.58a — Moteur `@atelier/cutting` : pièces prêtes à couper à partir d'une GarmentSpec.
- **Objectif** : `engines/cutting` (créé par `pnpm gen engine cutting`) produit, à partir d'une GarmentSpec 1.0 ou 1.1,
  les pièces prêtes à couper au format du contrat de fabrication actuel : valeur de couture par bord, crans, marques de
  pose, pièces au pli et dépliage si les marques diffèrent à gauche et à droite ; parité avec le golden de
  `engines/manufacturing`.
- **Périmètre** : `engines/cutting/**` ; `pnpm-workspace.yaml` et `pnpm-lock.yaml` (inscription par le générateur,
  `pnpm install`) ; dépendance à `@atelier/drafting` (géométrie) avec l'exception étroite de
  `docs/adr/0024-dependances-des-moteurs-typescript.md`, déclarée dans `engines/cutting/eslint.config.mjs` sous la forme
  que donne l'ADR (entrées ancrées : `src/**` n'importe que `^@atelier/drafting/geometry$` ; `test/**` aussi
  `^@atelier/drafting$`, pour tracer Brian) ; `"@atelier/drafting": "workspace:*"` dans `dependencies`.
- **Contexte** : `engines/manufacturing/src/manufacturing/core/offset.py`, `.../core/allowances.py`,
  `.../core/notches.py`, `.../core/finishing.py`, `.../spec/cut_patterns.py` ;
  `engines/manufacturing/tests/golden/straight-skirt-cut-pattern.json` et `test_reference_patterns.py` ; entrée :
  `engines/patterning/tests/golden/straight-skirt-reference.json` ; `contracts/schemas/manufacturing/` (format des
  pièces, matière et marques de pose depuis 1.54e) ; `docs/adr/0009-moteur-de-fabrication.md` ; `docs/suivi/essais/tuniques/cut.mjs` (valeurs par bord, crans de
  tête de manche par longueur d'arc et embu, dépliage) ; géométrie `@atelier/drafting/geometry` (1.57a).
- **Décisions déjà prises** :
  - Mêmes règles que `manufacturing` pour la parité ; les cas nouveaux (crans de tête de manche, dépliage) suivent
    l'essai.
  - Les références de la jupe droite (`straight-skirt-cut-pattern.json`, `.svg`, `.dxf`, `.pdf` de `manufacturing`) et
    son entrée (`straight-skirt-reference.json` du patronage) sont copiées à l'identique dans
    `engines/cutting/tests/golden/` (copie autorisée par cette fiche : les moteurs Python seront retirés) ; `cmp` le
    prouve dans le compte rendu.
- **Critères d'acceptation** : JSON des pièces de la jupe droite égal à la référence à 0,01 mm près, champs et ordre
  compris ; crans de tête de manche corrects sur la GarmentSpec de Brian (1.55b) ; tests.
- **Hors périmètre** : plan de coupe (1.58b), exports (1.58c, 1.58d), `engines/manufacturing` (lecture seule).
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/cutting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.56b — Catalogue 1 : Sandy, Bella et jupe droite

- **Tâche** : 1.56b — Sandy (jupe cercle), Bella (corsage avec garde-fous), jupe droite écrite sur l'API de FreeSewing.
- **Objectif** : le catalogue 1 est complet (Penelope reste écartée) ; même banc que 1.56a.
- **Périmètre** : `engines/drafting/**` (dépendances `@freesewing/sandy`, `@freesewing/bella` en 4.10.2 exacte).
- **Contexte** : `docs/suivi/essais/freesewing/fiches/bella.json` ; `docs/composants/contrats.md` (`highBust` =
  `highBustGirthMm`, requis par Bella) ; `docs/suivi/essai-freesewing.md` (garde-fous de
  Bella, raisons du rejet de Penelope) ; `docs/suivi/essais/freesewing/lib/designs.mjs` ;
  `engines/patterning/tests/golden/straight-skirt-reference.json` (forme attendue d'une jupe droite).
- **Critères d'acceptation** : banc vert pour les trois modèles ; la jupe droite est comparable à la jupe droite de
  référence du patronage (tour de taille, longueur, pinces) dans une tolérance écrite dans le test.
- **Hors périmètre** : opérations.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.57b — `drafting` : rejeu du document et opérations de forme

- **Tâche** : 1.57b — `replay(document)` et les opérations encolure, fente d'encolure, longueur de manche, poignet,
  fentes.
- **Objectif** : le moteur valide un document, trace sa base, applique ses opérations actives dans l'ordre et rend
  l'état rejoué, en moins de 10 ms tracé compris.
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/adr/0020-document-de-modele-et-operations.md` ;
  `contracts/schemas/designs/design-document.schema.json` et `design-operation.schema.json` (1.54b) ;
  `docs/suivi/essais/tuniques/ops.mjs` (`neckline`, `neckSlit`, `sleeveLength`, `cuff`, `slit`, `build`) ;
  `contracts/examples/design-documents/` (1.54b).
- **Décisions déjà prises** :
  - Une opération est une fonction pure sur l'état (pièces à rôles, repères, coupes, marques, pièces ajoutées), inscrite
    dans un registre par `op` ; elle déclare les rôles qu'elle exige et refuse proprement une base qui ne les a pas.
  - Ordre de rejeu par phase, puis ordre du document : déformation d'ourlet 0, encolure 1, longueur de manche 2, poignet
    3, fentes et bandes 4, découpes 5, fente d'encolure et patte 6, poches 7, galons 8, broderie 9.
  - Une opération masquée (`enabled: false`) n'est pas rejouée ; rien n'est figé par une opération suivante.
  - La validation du moteur complète le schéma (1.54b, `docs/composants/contrats.md`) : identifiants uniques, matières
    citées présentes dans la table, base, version et options FreeSewing connues, mesures complètes pour la base, une
    seule opération active par genre pour `hemShape`, `neckline`, `sleeveLength`, `cuff`, `sideSlit`, `neckSlit`,
    `placket` et `embroidery`, une bande par bord, au bas de manche un poignet ou une bande ; chaque refus est une
    erreur de validation typée qui nomme l'opération et la règle. Les types d'une opération se lisent par
    `Extract<DesignOperation, { op: … }>`.
  - Repère des pièces : y vers le bas, y = 0 en haut de la pièce de base (la manche de FreeSewing est translatée),
    comme le décrit `docs/composants/contrats.md`.
- **Critères d'acceptation** : chaque opération testée sur Brian avec les valeurs de l'essai ; masquage testé ; l'ordre
  du document entre deux phases différentes ne change pas le résultat ; erreur claire pour une opération inapplicable ;
  chaque règle de validation du moteur testée par un document fautif ;
  rejeu de la tunique neutre en moins de 10 ms (médiane sur 20).
- **Hors périmètre** : découpes et bandes (1.57c), ornements (1.57d).
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.58b — `cutting` : plan de coupe et métrage

- **Tâche** : 1.58b — Plan de coupe par matière et métrage conseillé.
- **Objectif** : laize pliée en deux, pièces au pli contre le pli, droit fil parallèle aux lisières, rangement « skyline
  », métrage (marge de 10 cm, arrondi au décimètre) ; parité avec `manufacturing`.
- **Périmètre** : `engines/cutting/**`, y compris une nouvelle référence golden de plan de coupe dans
  `engines/cutting/tests/golden/` (autorisée par cette fiche).
- **Contexte** : `engines/manufacturing/src/manufacturing/core/nesting.py`, `.../core/cutting_plan.py`,
  `.../spec/cutting_plans.py` ; `contracts/schemas/manufacturing/` (plan et métrage par matière depuis 1.54e) ; `docs/suivi/essais/tuniques/marker.mjs` ;
  `docs/suivi/essais/tuniques/metrage.json`.
- **Décisions déjà prises** : la référence du plan de coupe de la jupe droite est produite une fois par le moteur Python
  actuel (commande notée dans le test), versée telle quelle, puis exigée à l'identique ; si la parité est impossible
  pour une raison de fond, le signaler en point ouvert.
- **Critères d'acceptation** : parité avec la référence ; propriétés : pièces sans chevauchement et dans la laize ;
  tests.
- **Hors périmètre** : exports.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/cutting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.58c — `cutting` : exports SVG à l'échelle 1 et DXF-AAMA

- **Tâche** : 1.58c — Exports SVG et DXF de type AAMA, identiques aux références de `manufacturing`.
- **Objectif** : SVG à l'échelle 1 et DXF-AAMA (calques 1 contour, 4 crans, 7 droit fil, 8 lignes internes, 14 couture,
  15 texte) des pièces de coupe.
- **Périmètre** : `engines/cutting/**`.
- **Contexte** : `engines/manufacturing/src/manufacturing/export/svg.py`, `.../export/sheet.py`, `.../export/labels.py`,
  `.../export/dxf_writer.py`, `.../export/dxf_aama.py` ; `engines/manufacturing/tests/golden/straight-skirt.svg`,
  `straight-skirt.dxf` ; `docs/suivi/essais/tuniques/exports.mjs` (DXF de l'essai).
- **Décisions déjà prises** : les textes écrits dans les exports (noms de pièces, étiquettes, marques) sont échappés
  comme le fait `manufacturing` (`labels.py`) ; les nombres s'écrivent comme en Python (`f"{v:.2f}"` pour SVG et DXF, `.3f` pour le PDF, «
  -0.00 » ramené à « 0.00 ») ; Python arrondit au pair une égalité exacte (`f"{0.125:.2f}"` donne `0.12`) là où
  `toFixed` arrondit vers le haut : écrire un formateur commun qui reproduit Python, testé sur ces cas, réutilisé par
  1.58d.
- **Critères d'acceptation** : SVG et DXF de la jupe droite identiques octet pour octet aux golden de `manufacturing` ;
  si un écart est inévitable (format des nombres), il est expliqué en point ouvert au lieu d'adapter la référence.
- **Hors périmètre** : PDF (1.58d).
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/cutting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.57c — `drafting` : régions, découpes et déformation d'ourlet

- **Tâche** : 1.57c — Bandes rapportées, découpes prédéfinies et libres, déformation d'ourlet, régions et coutures.
- **Objectif** : une découpe coupe la pièce qu'elle traverse ; la partie retenue prend un nom et une matière ; une
  découpe peut être prédéfinie ou tracée librement ; l'ourlet peut être évasé et arrondi.
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/suivi/essais/tuniques/ops.mjs` (`band`, `decoupe`, `regions`, `resolvePoint`, `resolvePath`) ;
  `docs/suivi/essais/tuniques/geom.mjs` (`splitPolygon`, `crossings`) ;
  `docs/adr/0020-document-de-modele-et-operations.md` (opérations libres) ; `contracts/examples/design-documents/`
  (tuniques 2, 3 et 5).
- **Décisions déjà prises** :
  - Découpes prédéfinies (profondeur au milieu D, départ sur l'épaule W, en mm) : U = épaule à x = W, (W − 2 ; 0,465 D),
    (W − 18 ; 0,82 D), (0,56 W ; 0,97 D), (0 ; D), lissée ; pointe = épaule à x = W, (W − 6 ; 0,36 D), (0 ; D) ; carré =
    épaule à x = W, (W ; 0,86 D), (W − 14 ; D), (0 ; D) ; empiècement = (0 ; D) à (420 ; D).
  - Un point ancré à un bord par x ou y est borné à la plage du bord. Un chemin est prolongé à ses deux bouts (`extendMm`, 15 mm par
    défaut comme dans l'essai, 100 mm au plus ; le studio pourra demander davantage pour un tracé libre) pour croiser
    franchement le contour.
  - Partie retenue : celle qui contient le repère donné, ou la plus petite par l'aire.
  - Découpe libre sur une pièce coupée au pli : symétrique ; un chemin qui traverse le milieu est ramené à sa plus
    longue portion d'un côté.
  - Déformation d'ourlet : l'évasement déplace le coin d'ourlet vers l'extérieur et le côté sous sa mi-hauteur
    (progression t^1,6), l'ourlet proportionnellement ; l'arrondi relève l'ourlet de arrondi × u² (u = x / x du coin),
    les points du côté sous le nouveau coin disparaissent ; le milieu ne bouge pas.
- **Critères d'acceptation** : régions des tuniques 2, 3 et 5 avec les noms et matières attendus ; la somme des aires
  des régions vaut l'aire de la pièce ; une découpe qui ne traverse pas la pièce est refusée avec un message clair ;
  déformation testée (coin déplacé, milieu inchangé).
- **Hors périmètre** : ornements (1.57d).
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.58d — `cutting` : export PDF A4 à assembler

- **Tâche** : 1.58d — PDF A4 tuilé, écrivain PDF minimal porté de Python.
- **Objectif** : PDF 1.4 vectoriel en pages A4 à assembler (Helvetica non embarquée, WinAnsiEncoding), identique à la
  référence de `manufacturing`.
- **Périmètre** : `engines/cutting/**`.
- **Contexte** : `engines/manufacturing/src/manufacturing/export/pdf_writer.py`, `.../export/pdf_tiles.py` ;
  `engines/manufacturing/tests/golden/straight-skirt.pdf` ; `docs/adr/0009-moteur-de-fabrication.md` ;
  `docs/suivi/essais/tuniques/exports.mjs` (couverture avec plan d'assemblage et carré témoin de 10 cm, pages vides
  sautées : améliorations à proposer en point ouvert, pas à appliquer).
- **Critères d'acceptation** : PDF de la jupe droite identique octet pour octet au golden ; textes échappés comme dans
  `manufacturing` (test avec parenthèses et barre oblique inverse) ; tests.
- **Hors périmètre** : changement de mise en page (décision à part).
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/cutting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.57d — `drafting` : ornements, marques et sortie GarmentSpec

- **Tâche** : 1.57d — Patte, poche, galon, broderie ; marques de pose ; GarmentSpec 1.1 du document rejoué.
- **Objectif** : les opérations d'ornement et leurs pièces ajoutées existent ; le document rejoué donne une GarmentSpec
  1.1 (un panneau par région, matière, marques, crans) et un état lisible par `flats` (traits, ornements, repères).
- **Décisions déjà prises** (ADR 0024) : `flats` lit l'état rejoué comme une donnée, par `import type`, sans appeler
  aucune fonction de `drafting` hors de `./geometry` ; l'état porte donc lui-même les régions, coutures, ornements et
  repères (dans l'essai, `flat.mjs` appelait `regions()` de `ops.mjs`), et son type est une interface exportée par
  `drafting`.
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/suivi/essais/tuniques/ops.mjs` (`placket`, `pocket`, `trim`, `embroidery`, marques) ;
  `docs/suivi/essais/tuniques/cut.mjs` (`marksFor`) ; `docs/suivi/essais/tuniques/flat.mjs` (ce que le dessin lit dans
  l'état rejoué) ; `contracts/schemas/garment-spec.schema.json` (1.1) ; `docs/suivi/essais/tuniques/metrage.json`.
- **Critères d'acceptation** : les cinq tuniques de référence donnent le nombre de pièces de l'essai (11, 10, 10,
  7, 11) ; GarmentSpec valides ; marques présentes (poche, galons, boutons, fentes) ; parementures au pli.
- **Hors périmètre** : coupe, dessin.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.57e — `drafting` : preuve de généricité et documents de référence

- **Tâche** : 1.57e — Règle « aucun nom de vêtement », compositions au hasard, rejeu des six documents de référence.
- **Objectif** : prouver que les opérations ne connaissent aucun vêtement et que tout document valide se rejoue dans le
  budget.
- **Périmètre** : `engines/drafting/**`.
- **Contexte** : `docs/adr/0020-document-de-modele-et-operations.md` (règle de lint et test de généricité) ;
  `contracts/examples/design-documents/` ; `docs/suivi/essai-tuniques.md`.
- **Décisions déjà prises** : la règle est une règle eslint (`no-restricted-syntax`) sur le dossier des opérations :
  aucun littéral ni identifiant ne nomme un vêtement ou un modèle du catalogue.
- **Critères d'acceptation** : la règle échoue sur un exemple fautif (test) ; 200 compositions au hasard par base
  (graine fixe) sont soit rejouées, soit refusées par une erreur de validation typée ; les six documents de référence se
  rejouent en moins de 10 ms (médiane sur 20).
- **Hors périmètre** : coupe.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/drafting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.59a — `flats` : dessins face et dos, zones et poignées

- **Tâche** : 1.59a — Moteur `@atelier/flats` : dessin technique assemblé.
- **Objectif** : `engines/flats` (créé par `pnpm gen engine flats`) dessine, à partir de l'état rejoué de `drafting`, le
  vêtement de face et de dos, au trait et en couleurs, et rend aussi ses zones touchables et les repères des poignées
  pour le studio.
- **Périmètre** : `engines/flats/**` ; `pnpm-workspace.yaml` et `pnpm-lock.yaml` (inscription par le générateur,
  `pnpm install`) ; dépendance à `@atelier/drafting` avec l'exception étroite de
  `docs/adr/0024-dependances-des-moteurs-typescript.md`, déclarée dans `engines/flats/eslint.config.mjs` sous la forme
  que donne l'ADR : `src/**` importe `@atelier/drafting/geometry` et `@atelier/drafting` en `import type` seulement
  (`@typescript-eslint/no-restricted-imports`, `allowTypeImports`) ; `"@atelier/drafting": "workspace:*"` dans
  `dependencies`.
- **Contexte** : `docs/suivi/essais/tuniques/flat.mjs`, `docs/suivi/essais/tuniques/motifs.mjs` ; `engines/drafting`
  (état rejoué, 1.57d) ; `docs/adr/0022-interface-du-studio-v2.md` (deux thèmes, trait du dessin technique comme
  signature).
- **Décisions déjà prises** :
  - Les couleurs viennent de l'appelant (thème : fond, encre, piqûres) ; en couleurs, l'encre suit la luminance du tissu
    principal (claire sur tissu foncé, foncée sur tissu clair) ; au trait, les pièces sont peintes du fond du thème.
  - Matières : unis et imprimés (bogolan, géométrique, tissage, rayure, vichy), galons rayé et grecque, broderie.
  - Sorties : SVG, liste des zones (régions, manches, ourlet, encolure, poches, patte, galons) avec leur contour,
    repères (coin d'ourlet, milieu d'encolure, point d'encolure, bas de manche et son axe, points des chemins de découpe
    et de galon).
- **Critères d'acceptation** : cinq tuniques et tunique neutre dessinées sans erreur, face et dos, deux rendus ; zones
  et repères présents ; moins de 4 ms par dessin (médiane sur 20) ; SVG bien formé.
- **Hors périmètre** : planches (1.59b), studio.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/flats`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.58e — Porte J1 : cinq tuniques de bout en bout

- **Tâche** : 1.58e — Test d'intégration document → `drafting` → GarmentSpec 1.1 → `cutting` → pièces et métrage.
- **Objectif** : la porte J1 est vérifiée par un test.
- **Périmètre** : `engines/cutting/**` (`@atelier/drafting` est déjà une dépendance depuis 1.58a ; son rejeu ne sert
  qu'aux tests, selon `docs/adr/0024-dependances-des-moteurs-typescript.md`).
- **Contexte** : `contracts/examples/design-documents/` ; `docs/suivi/essais/tuniques/metrage.json` ;
  `docs/suivi/essai-tuniques.md` (pièces et métrages attendus).
- **Critères d'acceptation** : pièces 11, 10, 10, 7, 11 ; métrages 2,80 ; 2,10 + 0,70 ; 2,10 + 0,70 ; 2,60 ; 2,70 + 0,40
  m (à 0,1 m près, écart expliqué sinon) ; rejeu et coupe en moins de 30 ms par tunique.
- **Hors périmètre** : exports.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/cutting`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.59b — `flats` : planches de patrons et textures par pièce

- **Tâche** : 1.59b — Planche à l'écran et textures pour la 3D.
- **Objectif** : planche de patrons (pièces de `cutting` : coupe, couture, pli, droit fil, crans, marques, liste de
  coupe, fournitures) ; une texture par panneau (motif posé dans les coordonnées à plat) pour le lot 9.
- **Périmètre** : `engines/flats/**` ; `pnpm-lock.yaml` ; dépendance à `@atelier/cutting` avec l'exception étroite de
  `docs/adr/0024-dependances-des-moteurs-typescript.md` : `@atelier/cutting` s'importe depuis `src/sheet/**` et les
  tests seulement ; `"@atelier/cutting": "workspace:*"` dans `dependencies`.
- **Contexte** : `docs/suivi/essais/tuniques/sheet.mjs` ; `engines/cutting` (1.58a) ; `engines/flats` (1.59a).
- **Critères d'acceptation** : planches des six documents de référence ; une texture par panneau, alignée sur la boîte
  du panneau en mm ; tests.
- **Hors périmètre** : studio, drapé.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/flats`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.60b — `designs` : versions du document, validation par `drafting`

- **Tâche** : 1.60b — Créer une version de modèle à partir d'un document, validé et rejoué sous Node.
- **Objectif** : `designs` accepte un document de modèle, le valide (schéma et rejeu par `@atelier/drafting`), le stocke
  en JSONB et dérive la GarmentSpec, mise en cache par empreinte du document et des versions des moteurs.
- **Périmètre** : `services/designs/**` (migration additive `0004`) ; `pnpm-lock.yaml` ; dépendance à
  `@atelier/drafting` par son entrée `@atelier/drafting/node`, importée seulement dans `src/adapters/engines/` et les
  tests, `"workspace:*"` dans `dependencies` ; `eslint.config.mjs` racine, par exception accordée pour cette tâche :
  bloc de `designs` donné par `docs/adr/0024-dependances-des-moteurs-typescript.md` (pas de
  `services/designs/eslint.config.mjs`, qui perdrait les règles des couches ; tous les projets deviennent « touchés »).
- **Contexte** : `services/designs/AGENTS.md` ; `services/designs/src/domain/` ; `services/designs/src/application/` ;
  `services/designs/migrations/0001_init.sql` (`design_versions`) ;
  `services/designs/src/adapters/engines/http-patterning-engine.ts` (port actuel du moteur de patronage) ;
  `services/designs/test/unit/`, `test/integration/` (PGlite), `test/http/` ; `contracts/openapi/designs.yaml` (1.60a) ;
  `docs/composants/designs.md`.
- **Décisions déjà prises** : le domaine ne dépend que d'un port (« moteur de tracé ») ; l'adaptateur appelle
  `@atelier/drafting` dans le processus ; migration additive (colonnes facultatives), aucune donnée existante modifiée.
  - Le plus grand document permis par le schéma fait environ 100 Ko : la limite de corps de NestJS (100 Ko par défaut)
    est relevée pour cette route, avec une borne écrite. Un document avec `measurementSet` porte une donnée personnelle :
    ni document ni mesure dans les journaux ni dans les erreurs relayées (ADR 0024).
- **Critères d'acceptation** : tests unitaires, d'intégration et HTTP ; un document invalide donne une erreur 422 du
  contrat ; les routes existantes restent vertes.
- **Hors périmètre** : exports (1.60c), studio.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/designs`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.

## 1.60c — `designs` : exports à la demande par `cutting`

- **Tâche** : 1.60c — Pièces, plan de coupe, PDF, DXF et SVG calculés par `@atelier/cutting` sous Node.
- **Objectif** : pour une version portant un document, la route de fabrication (ADR 0012) calcule avec
  `@atelier/cutting` ; l'ancien relais vers `engines/manufacturing` reste pour les versions sans document.
- **Périmètre** : `services/designs/**` ; `pnpm-lock.yaml` ; dépendance à `@atelier/cutting` par son entrée
  `@atelier/cutting/node`, importée seulement dans `src/adapters/engines/` et les tests, `"workspace:*"` dans
  `dependencies` ; `eslint.config.mjs` racine (ajout de `^@atelier/cutting/node$` au bloc de `designs` posé par 1.60b),
  selon `docs/adr/0024-dependances-des-moteurs-typescript.md`. Un calcul qui dépasse son budget passe dans un fil de
  travail : décision à prendre ici, sur mesures (ADR 0024).
- **Contexte** : `services/designs/src/adapters/engines/http-manufacturing-engine.ts` ; routes de fabrication de
  `contracts/openapi/designs.yaml` ; `docs/adr/0012-fabrication-via-designs.md` (erreurs relayées, liste blanche) ;
  `engines/cutting` (1.58d) ; `services/designs/test/http/`.
- **Critères d'acceptation** : export de la jupe droite par `cutting` identique à celui du golden de `manufacturing` ;
  tests HTTP des deux chemins.
- **Hors périmètre** : studio.
- **Vérification** : `pnpm nx run-many -t lint typecheck test -p @atelier/designs`.
- **Compte rendu attendu** : format « Compte rendu », quinze lignes au plus.
