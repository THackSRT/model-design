# 0013 — Drapé physique : XPBD sur CPU en TypeScript, sans dépendance, en tâche NATS

**Contexte.** Le travail 1.19 remplit le squelette `engines/drape` : coudre virtuellement les pièces d'une
`GarmentSpec` autour de l'avatar et simuler le tombé du tissu (architecture 5.4 : glTF et carte d'aisance, 5 à
60 s, en tâche). Le squelette est en Python et prévoyait NVIDIA Warp. Constats (1er octobre 2026) :

- **NVIDIA Warp** (`warp-lang` 1.17.0, roue `py3-none-win_amd64` téléchargée de PyPI) : métadonnées
  `License: Apache-2.0`, mais `warp/bin/warp.dll` (323 Mo) lie statiquement des composants propriétaires dont
  les licences sont jointes à la roue : `cuda-LICENSE.txt` et `nvrtc-LICENSE.txt` (NVIDIA Software License
  Agreement et CUDA Supplement), `libmathdx-LICENSE.txt` (« This project, NVIDIA Warp, statically links
  libmathdx » : License Agreement for NVIDIA Math Libraries SDK), `nanovdb-LICENSE.txt` (« Any use, reproduction,
  disclosure or distribution … without an express license agreement from NVIDIA CORPORATION is strictly
  prohibited »). S'y ajoutent un code dérivé d'OpenUSD (Apache 2.0 modifiée, clause 6) et une image de test sous
  CC BY 4.0. Dépendance d'exécution : `numpy` (écarté par l'ADR 0009 : libquadmath LGPL-2.1, support GCC
  GPL-3.0 avec exception). Warp fonctionne sur ce poste (`wp.init()` : « CUDA Toolkit 12.9, Driver 12.3 »,
  périphériques `cpu` et `cuda:0` NVIDIA GeForce RTX 3050 Laptop GPU, 4 Gio, sm_86 ; `nvidia-smi` : pilote
  546.92) et sur CPU, mais il est hors de la liste des licences permises, deux fois.
- **Python pur** (sans numpy) : une passe de projection XPBD sur 14 421 contraintes de distance (grille de
  4 900 sommets) prend 18 ms par itération en CPython 3.12, soit environ 130 s pour un drapé de 3 s simulées
  (1 800 sous-pas, étirement, flexion, collisions) : hors cible.
- **TypeScript sur Node 24** (tableaux typés, même boucle) : 0,4 à 0,7 ms par itération une fois compilé à la
  volée, 25 à 45 fois plus rapide, soit 3 à 10 s pour le même drapé, sans aucune dépendance.
- **L'avatar n'existe qu'en TypeScript** : `engines/mannequin` (ADR 0004) ajuste le corps MakeHuman, en cm,
  à l'identique dans Node et dans le navigateur. Un moteur Python devrait recevoir le maillage (fichier lourd
  venu du client, donc non fiable) ou porter l'ajustement.
- **Placement et coutures** : la spécification n'a pas de placement 3D. Une pièce `cutOnFold` est une demi-pièce
  (corsage, jupe droite), une pièce `quantity: 2` (manche) est cousue des deux côtés, et les coutures
  `{panelId, edgeId}` ne disent ni quel exemplaire ni dans quel sens : `sleeve.cap-front` se coud sur
  `front.armhole`, qui existe à gauche et à droite une fois la pièce dépliée. Sur les références golden du
  patronage, deux bords cousus vont en sens opposés une fois les pièces dépliées et retournées (entrejambe,
  montant, pinces, manche), y compris la couture de côté de la jupe droite (`front.side-lower` et
  `back-right.side-lower` montent tous deux, mais `front` est dépliée : sa copie retournée descend).
- Le travail 1.34a écrit dans `engines/mannequin` un habillage géométrique rapide, sans physique.

**Décision.**

- **Méthode : dynamique à base de positions étendue (XPBD, Macklin 2016) à petits pas** (« Small Steps »,
  Macklin 2019 : un pas de 1/60 s en 10 à 20 sous-pas, une itération chacun, Gauss-Seidel dans un ordre fixe).
  Contraintes : étirement par arête, souplesse anisotrope interpolée entre chaîne et trame selon l'angle de
  l'arête et du droit fil ; flexion isométrique quadratique (Bergou 2006 : matrice constante par arête
  intérieure, sans trigonométrie) ; couture (distance de longueur nulle entre points appariés, souplesse
  décroissante pendant une phase de couture à gravité réduite) ; collision avec le corps (sommet contre
  triangle, grille de hachage spatial du corps statique, épaisseur = épaisseur du tissu + 2 mm) avec frottement
  de Coulomb positionnel. Arrêt au bout d'un nombre fixe de pas, ou plus tôt si la vitesse maximale reste sous
  1 mm/s pendant 10 pas : critère déterministe. Écartés : masses-ressorts explicites (instables sur tissu
  rigide), éléments finis implicites (solveur linéaire à écrire, gain inutile ici). L'auto-collision du
  vêtement vient dans un second temps (vêtements à une couche d'abord ; ceinture et parementures ensuite).
- **Langage : TypeScript, sans aucune dépendance de calcul.** `engines/drape` devient le paquet
  `@atelier/drape` (Node, et plus tard navigateur pour les petites retouches, architecture 5.4), sur le modèle de
  `engines/mannequin` : deuxième exception à « Python pour les moteurs » (ADR 0003), justifiée par l'avatar en
  TypeScript, l'absence de calcul numérique rapide sous licence permise en Python et l'usage futur dans le
  navigateur. Le squelette Python est retiré (membre de l'espace uv, `.importlinter`, FastAPI). Couches :
  `src/core/` (pur : ni E/S, ni horloge, ni hasard, millimètres, grammes, secondes), `src/body/` (avatar par
  `@atelier/mannequin`, cm → mm ici seulement), `src/output/` (glTF), `src/adapters/` (NATS, stockage,
  journal), `src/main.ts` ; frontières vérifiées par le lint (`no-restricted-imports`).
- **Déterminisme.** `Float64Array`, boucles dans un ordre fixe, un seul fil, seulement `+ − × ÷`, `Math.sqrt`,
  `Math.abs`, `min`, `max` dans le cœur (pas de `sin`, `cos`, `acos`, dont le résultat dépend du moteur
  JavaScript) : même entrée, même sortie au bit près sur Node. Positions arrondies à 0,1 mm avant l'écriture.
  Le GLB est identique octet pour octet d'une exécution à l'autre (ni date, ni identifiant aléatoire).
- **Le GPU n'est pas requis.** Le drapé tourne sur CPU partout (postes, conteneur, tests). Un calcul GPU
  viendra par une nouvelle ADR : XPBD en WebGPU (même algorithme), ou Warp si l'utilisateur accepte une
  exception aux licences (composants NVIDIA propriétaires et numpy), dans un worker séparé derrière le même
  contrat de tâche.
- **Avatar recalculé, jamais transmis.** La tâche porte les mesures et les options d'ajustement ; le moteur
  ajuste le corps avec `@atelier/mannequin` (0,1 à 0,5 s), exactement celui que le studio affiche avec les mêmes
  options. Aucun maillage d'avatar n'est stocké. Le glTF ne contient que le vêtement.
- **Position initiale propre au drapé ; l'habillage géométrique (1.34a) sert de comparaison.** La physique
  exige un départ hors du corps, à distance connue, pièces à leur longueur de repos et coutures écartées d'un
  écart contrôlé ; un habillage visuel ne le garantit pas. Le drapé enroule chaque pièce autour de la section du
  corps (enveloppe convexe de la tranche du maillage à la hauteur du repère, décalée de `clearanceMm`). L'habillage
  1.34a est l'aperçu instantané affiché pendant le calcul, et un test de cohérence (écart moyen borné entre les
  deux sur la jupe droite). Les deux lisent le même `Panel.placement`. À revoir si 1.34a garantit une
  application continue pièce → 3D sans pénétration : il deviendrait alors le départ du drapé.
- **Contrat** (à écrire par le travail 1.19a, changements compatibles, `specVersion` reste `1.0`) :
  - `garment-spec.schema.json`, `Panel.placement` (facultatif) → `$defs/PanelPlacement`, fermé :
    `zone` (`torso`, `leg`, `arm`), `bodySide` (`left`, `right`, `center` : côté du porteur où va la pièce telle
    que dessinée), `facing` (`front`, `back`, `outer` : face du corps vers laquelle regarde l'endroit de la
    pièce ; `outer` pour une pièce enroulée autour d'un membre), `anchor` (`point` : un `Point` de la pièce ;
    `landmark` : `neck`, `shoulder`, `waist`, `hip`, `crotch`, `knee`, `ankle`, `wrist` ; `offsetMm`, −500 à
    500 : ce point va sur la ligne médiane de la face `facing`, à la hauteur du repère plus le décalage),
    `clearanceMm` (5 à 150, 30 par défaut). Règles écrites dans les descriptions : une pièce `cutOnFold` est
    dépliée par symétrie sur son bord `fold`, sa moitié dessinée du côté `bodySide` ; une pièce `quantity: 2`
    donne une copie telle que dessinée du côté `bodySide` et une copie retournée de l'autre côté.
  - `Seam` : description complétée. Après dépliage et retournement, `a` se coud de son début (`from`) vers sa
    fin sur `b` de sa fin vers son début (sens opposés). Une couture entre deux bords présents des deux côtés
    est dupliquée côté par côté ; entre un bord présent des deux côtés et un bord d'un seul côté, elle prend la
    copie de ce côté. `EdgeRef.side` (facultatif, `left` ou `right`) force la copie quand la règle ne suffit pas.
  - `schemas/avatar-options.schema.json` : `age` (16 à 90), `morphotype` (`african`, `asian`, `caucasian`,
    0 à 1), `armAngleDeg` (0 à 45) : les `FitOptions` du mannequin, défauts du studio (30, africain, 9°).
  - `schemas/drape/fabric.schema.json` : `preset` (`cotton-poplin`, `cotton-wax`, `bazin`, `linen`, `denim`,
    `silk-satin`, `jersey`) et surcharges facultatives `weightGPerM2` (20 à 800), `thicknessMm` (0,1 à 5),
    `stretchWarpPercent` et `stretchWeftPercent` (allongement sous 10 N sur 50 mm de large, 0 à 100),
    `bendingRigidityMicroNm` (rigidité de flexion par unité de largeur, µN·m, comme la valeur B de Kawabata),
    `frictionCoefficient` (0 à 1,5). Les valeurs des préréglages sont dans le moteur, marquées estimées.
  - `schemas/drape/drape-job.schema.json` (`DrapeJob`) : `drapeId`, `organizationId`, `designId`,
    `versionNumber`, `spec`, `measurements` (`MeasurementSet`), `avatar` (`AvatarOptions`), `fabric`,
    `quality` (`draft` : arête de 25 mm, `standard` : 15 mm). `schemas/drape/drape-result.schema.json` :
    `modelKey`, `sizeBytes`, `sha256`, `ease` (`minMm`, `medianMm`, `maxMm`, `tightAreaMm2` : surface où
    l'aisance est nulle), `maxStrainPercent`, `fabricEstimated`, `engineVersion`, `vertexCount`,
    `simulatedSteps`, `converged`.
  - Événements (`asyncapi/events.yaml`, enveloppe CloudEvents) : `drape.requested` (données `DrapeJob`,
    producteur `designs`, consommateur `drape`) ; `drape.completed` (`drapeId`, `designId`, `versionNumber`,
    `organizationId` + `DrapeResult`) et `drape.failed` (mêmes identifiants, `type` parmi
    `/problems/drape-placement-missing`, `drape-placement-failed`, `drape-seam-not-closed`,
    `drape-body-penetration`, `drape-too-large`, `drape-internal`, et `retryable`), producteur `drape`,
    consommateur `designs`. Aucun texte libre.
  - `openapi/designs.yaml` : `POST /v1/designs/{id}/versions/{n}/drapes` (corps `DrapeRequest` : `fabric`,
    `avatar`, `quality` ; 202 et `Drape`, ou 200 et le drapé existant pour la même demande),
    `GET …/drapes/{drapeId}` (`Drape` : `id`, `status` `pending`/`completed`/`failed`, `problemType`, `ease`,
    `maxStrainPercent`, `fabricEstimated`, `createdAt`, `completedAt`), `GET …/drapes/{drapeId}/model`
    (`model/gltf-binary`). `drape-timeout` s'ajoute aux types d'erreur stables.
- **Tâche NATS, pas d'appel synchrone.** 5 à 60 s dépassent le délai des appels de services (2 s). `designs`
  enregistre le drapé `pending` et écrit `drape.requested` dans son outbox, dans la même transaction ; le
  relais publie (sujet = type, ADR 0008) dans le flux `DRAPE_JOBS` (rétention « file de travail », âge maximal
  24 h), déclaré par `designs`. Le moteur le consomme (consommateur durable `drape`, un message à la fois,
  `AckWait` 60 s prolongé toutes les 15 s, 2 livraisons au plus), publie `drape.completed` ou `drape.failed`
  dans le flux `DRAPE` (sujets `drape.completed`, `drape.failed`), qu'il déclare, avec `Nats-Msg-Id` =
  `<drapeId>.<completed|failed>`, puis acquitte. Le moteur n'a pas de base, donc pas d'outbox : publier avant
  d'acquitter donne « au moins une fois », `designs` est idempotent. `designs` consomme `DRAPE` (consommateur
  durable `designs-drape`) et marque un drapé encore `pending` après 10 minutes comme `failed`
  (`drape-timeout`) à la lecture. Le studio interroge `GET …/drapes/{id}` toutes les 2 s (temps réel plus tard).
- **Cache à deux niveaux.** `designs` rend le drapé existant pour la même (version, empreinte SHA-256 du
  `DrapeRequest` canonique), sauf s'il a échoué. Le moteur calcule `cacheKey` = SHA-256 du JSON canonique
  (`spec`, `measurements`, `avatar`, `fabric` résolu, `quality`, `ENGINE_VERSION`) et écrit
  `drapes/<organizationId>/<cacheKey>.glb` dans le stockage S3 (SeaweedFS en local, ADR 0006) ; si l'objet
  existe déjà, il publie le résultat sans recalcul. Le préfixe d'organisation empêche tout partage entre
  organisations. Un changement de `@atelier/mannequin` change l'avatar : un test de caractérisation du drapé
  (empreinte du corps d'un jeu de mesures fictif) oblige alors à monter `ENGINE_VERSION`.
- **Stockage S3** par `aws4fetch` (MIT, aucune dépendance, signature AWS v4 sur `fetch`), à vérifier dans la
  tâche ; dans `engines/drape` (écriture) et `services/designs` (lecture), derrière un port `ObjectStore`.
  Identifiants par variables d'environnement ; seau `drapes` privé ; jamais d'URL publique : le studio lit le
  modèle par `designs`, qui vérifie l'organisation.
- **glTF 2.0 binaire écrit par le moteur**, sans bibliothèque : une primitive par exemplaire de pièce
  (`<panelId>`, `<panelId>@left`), `POSITION` et `NORMAL` en **mètres** (unité imposée par glTF, conversion
  dans `src/output/` seulement), `TEXCOORD_0` = coordonnées de la pièce à plat en mètres (retournées pour une
  copie retournée), attributs `_EASE_MM` (distance au corps moins l'épaisseur) et `_STRAIN` (allongement
  relatif), `asset.generator` = `atelier-drape <ENGINE_VERSION>`.
- **Bornes et sécurité.** 40 pièces, 2 000 bords, 30 000 sommets de vêtement (`drape-too-large`), nombre de pas
  fixé par la qualité : durée bornée. Le message de tâche contient des mesures (données personnelles) : jamais
  journalisé, flux à rétention courte ; le GLB révèle la silhouette : seau privé, clé non devinable hors du
  moteur, lecture par `designs` seulement, `Cache-Control: private, no-store`.

**Conséquences.** Aucune dépendance de calcul nouvelle, pas de GPU requis, des sorties reproductibles et des
tests physiques simples (porte-à-faux : longueur de flexion (B/W)^(1/3) ; bande suspendue : allongement
déclaré ; couture fermée à 2 mm ; pénétration sous 3 mm). En contrepartie, le cœur (maillage, contraintes,
collisions, glTF) est à écrire et à tester nous-mêmes, et le temps sur CPU limite la finesse du maillage (arête
de 15 mm). Le moteur de patronage doit fournir `placement` (travail 1.19c, références golden à régénérer, avec
`ENGINE_VERSION`). La documentation (architecture 5.4, séquence A : `drape.completed` remplace
`pattern.draped`, `AGENTS.md` racine et du moteur) suit. Les propriétés des préréglages sont des estimations à
remplacer par le moteur Tissu numérique ; un tissu estimé est signalé (`fabricEstimated`). Revoir cette décision
si un GPU devient nécessaire (maillage plus fin, temps réel), ou si une bibliothèque permissive de simulation
de tissu apparaît.

**Décisions de l'orchestrateur, sur délégation de l'utilisateur (01/10/2026).** Exception à l'ADR 0003 acceptée :
`engines/drape` devient un moteur TypeScript (`@atelier/drape`), le squelette Python est supprimé. Warp n'est
pas retenu : l'exception de licence qu'il demanderait (composants NVIDIA propriétaires, numpy) reste une décision
de l'utilisateur, à poser seulement si un calcul sur GPU devient nécessaire. Les références golden du patronage
peuvent être régénérées pour y ajouter `placement` (ajout seul, tâche 1.19c). Le moteur mannequin exposera les
repères d'épaule et de poignet et l'axe des bras (tâche à part, avant 1.19d). Les propriétés des préréglages de
tissu (dont wax et bazin) sont des estimations, signalées comme telles, à faire valider par un modéliste ou un
vendeur de tissus.

**Décisions de l'orchestrateur, sur délégation de l'utilisateur (02/10/2026) : maillage des pièces (1.19d).**
La triangulation de Delaunay est construite par insertion incrémentale avec retournements de Lawson (même
résultat que Bowyer-Watson, plus robuste aux points cocycliques du réseau), les arêtes de bord sont récupérées
par retournements (Sloan) et les triangles hors de la pièce retirés par un parcours pair-impair. Un raffinement
ajoute un sommet au milieu des arêtes intérieures de plus de 1,2 h (au plus 8 passes) : sans lui, le réseau seul
laisse des arêtes de 1,6 h. Les bords cousus entre eux, de proche en proche (une manche cousue au devant et aux
deux dos), forment un groupe qui reçoit un seul nombre de parts, ceil(plus grande longueur / h), pour que les
points soient appariés un à un. Les coutures sont appariées dans le sens du parcours antihoraire une fois posé,
rang i contre rang n − i. Règles de côté : une pièce sans `placement` est au centre ; une pièce au centre avec
`quantity: 2` a sa copie 0 à droite ; une pièce sur pliure avec `quantity` différente de 1, ou une `quantity`
supérieure à 2, est refusée (`InvalidInputError`) ; une couture entre un bord à deux exemplaires et un bord unique
au centre exige `EdgeRef.side`. Limites : 40 pièces (`MAX_PANELS_PER_GARMENT`), 2 000 bords, 30 000 sommets
(`DrapeTooLargeError`). `ENGINE_VERSION` 0.4.0.

**Bornes contre une entrée hostile (02/10/2026, décision de l'orchestrateur après relecture).** Le maillage sera
exposé par 1.19g à des `GarmentSpec` venus du réseau : aucune entrée ne doit le faire tourner sans fin ni
allouer sans borne. Les coordonnées doivent être finies et de valeur absolue au plus 10 m (`MAX_COORDINATE_MM`),
sinon `InvalidInputError` ; les boucles géométriques tournent sur un indice entier borné ; le nombre de sommets
est estimé avant tout travail coûteux (longueur des bords / h, aire / (√3/2·h²)) et le budget restant du vêtement
est passé à chaque pièce, de sorte que `DrapeTooLargeError` tombe avant le maillage ; le nombre de coutures est
borné. Une borne des coordonnées dans le contrat (`Point`) reste à décider (tâche 1.41).
