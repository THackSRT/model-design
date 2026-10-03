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

**Borne au contrat (02/10/2026, tâche 1.41).** La borne est désormais aussi dans le contrat : chaque coordonnée
d'un `Point` de `GarmentSpec` est comprise entre −10 000 et 10 000 mm, bornes comprises, de sorte qu'une entrée
hostile est refusée dès la validation à l'entrée d'un service ou d'un moteur. Les sorties de la fabrication
(`CutPattern`, `CuttingPlan`) ont leur propre `Point`, non borné : la ligne de coupe dépasse la ligne de couture
des valeurs de couture, et un plan de coupe en série dépasse 10 m.

**Avatar et premier drapé (1.19e, 02/10/2026, décision de l'orchestrateur).** L'import de `@atelier/mannequin` par
`engines/drape` est une exception étroite aux contraintes de dépendance du lint : seul `src/body/` (et ses
tests) peut l'importer ; elle est déclarée dans `eslint.config.mjs` du moteur et commentée à la racine, sans
relâcher les autres règles. `drapeGarment(job)` (ENGINE_VERSION 0.5.0) drape la jupe droite en brouillon :
convergence, aucune pénétration, coutures fermées, aisance cohérente avec l'habillage géométrique. Les autres
vêtements ne sont pas encore tenus : jupe cercle et pantalon finissent en `seam-not-closed`, le corsage en
`body-penetration`, le corsage à manches converge mais avec une aisance négative. Il leur faut un maintien
(ceinture, épaules), un pantalon posé jambe par jambe et des réglages par type de vêtement (tâche 1.19e2) ; ces
problèmes typés sont rendus tels quels, jamais masqués.

**Maintien des vêtements sur l'avatar (1.19e2, 02/10/2026, décision de l'orchestrateur sur proposition de
l'architecte).** Constats, mesurés sur le moteur 0.5.0 construit (brouillon, mesures fictives des références,
popeline, essais hors du dépôt) :

- **La mesure de pénétration est aveugle au-delà de 10 mm.** `maxPenetration` ne regarde que la portée de la grille
  de collision (épaisseur + 2 mm + 8 mm) et tire le signe de la normale de la face la plus proche, faux près d'une
  arête concave. Le corsage à manches, rendu comme un succès par 1.19e, a des sommets 60 mm dans le corps ; le
  pantalon 57 mm (cuisse) ; la jupe cercle 57 mm.
- **Jupe cercle : départ faux.** La hauteur sur le corps est l'ordonnée du patron, or la taille d'une jupe cercle est
  un arc (ses bouts 104 mm au-dessus de l'ancre). Le tour fini d'un tube (`widths.ts`) somme l'étendue en x des pièces
  à une hauteur : à hauteur de ceinture, l'étendue de la jupe (≈ 1 500 mm) élargit la ceinture, dont les coutures de
  côté partent à 971 mm l'une de l'autre (898 mm en sommant les intervalles intérieurs) ; la ceinture finit 470 mm
  sous la taille.
- **Corsage : la couture d'épaule traverse le corps.** Devant et dos montent droits, les coutures d'épaule partent à
  257 mm ; en se fermant elles tirent le haut des pièces à travers l'épaule et la base du cou (−54 mm). Couture sous
  gravité nulle : même résultat (ce n'est pas la chute). Bras à 9° : le bras touche le flanc, 27 sommets repoussés de
  20 mm au départ ; à 30° : 4 sommets, 9 mm.
- **Corsage à manches : les manches glissent** de 130 mm le long du bras et entraînent le devant (−185 mm).
- **Pantalon : pièces tournées autour de la jambe.** L'ancre (coin taille-montant) va au milieu de la face de la coupe
  de la jambe : entrejambe haute écartée de 203 mm au départ, côté haut de 109 mm, fermé à 2,6 mm seulement.
- **Épingles fixes** (sommets du haut immobiles à leur position de départ, essayées) : les coutures ne se ferment plus
  (257 mm sur le corsage, 971 mm sur la jupe cercle à la fin).

Décision :

- **Pénétration et aisance mesurées par un test de parité** (1.19e2a, avant le reste). Un sommet est dedans si un
  rayon de direction fixe, légèrement inclinée sur les axes, croise le corps fermé un nombre impair de fois (grille 2D
  des triangles projetés, ordre fixe, `+ − × ÷` et `Math.sqrt` seulement) ; sa profondeur est sa distance à la
  surface. `PENETRATION_TOLERANCE_MM` (3) s'applique à cette mesure, sans limite de portée, et `vertexEase` prend
  son signe du même test. La collision de la boucle ne change pas.
- **Maintien : tenue XPBD sur un axe, pendant la mise en forme seulement.** Une tenue est une contrainte scalaire
  `C = a·x − t` (sommet, axe unitaire `a`, position visée `t` en mm le long de l'axe), raide comme une couture finie
  (`SEWING_FINAL_RATIO` fois la souplesse moyenne d'une arête), résolue après les coutures. Elle tient la hauteur et
  laisse libre le plan horizontal : la ceinture se resserre sur le corps sans glisser, les épaules se ferment
  au-dessus de l'épaule. Active pendant la couture, puis relâchée en `holdReleaseSteps` pas (souplesse divisée par
  r, r de 1 à 0 linéaire), puis absente : l'état final est purement physique (une taille trop large descend, et
  l'aisance le montre). L'arrêt au repos ne compte qu'après le relâchement. Cible = position de départ le long de
  l'axe (« tenu là où il est posé »). Vêtements tenus : bords `role: waistline` des pièces `torso` et `leg` (axe
  vertical) ; coutures d'épaule (axe vertical) ; haut de manche (axe du bras). Une couture d'épaule est une couture
  entre une pièce `torso` `facing: front` et une `facing: back` dont tous les points ont une hauteur reportée (hauteur
  du repère + y − y de l'ancre) d'au moins `shoulder` − 30 mm ; un haut de manche, les bords d'une pièce `arm` dont une
  extrémité est le point d'ancrage (à 0,5 mm près). Aucun changement de contrat : `waistline` existe ; un rôle
  `shoulder` ajouté à l'énumération fermée casserait les consommateurs stricts.
- **Mise en place par la ligne d'ancrage** (pièces `torso` et `leg`). La ligne d'ancrage est la chaîne des bords du
  contour qui passe par le point du contour le plus proche de l'ancre, prolongée de chaque côté tant que l'angle au
  raccord reste sous 45°, qui enjambe une pince (deux bords de la pièce cousus l'un à l'autre : reprise au point
  d'ouverture opposé) et jamais un bord `fold`. Un sommet est repéré par (s, d) : abscisse de son projeté sur la
  ligne depuis l'ancre, distance signée à la ligne (vers le bas positif). Hauteur sur le corps = hauteur du repère −
  d ; abscisse sur la courbe = s × k(d), k(d) = longueur de l'isoligne d de la pièce (marche sur ses triangles à plat)
  / longueur de sa ligne d'ancrage ; le tour fini d'un tube à une hauteur est la somme des longueurs d'isoligne des
  pièces à cette hauteur. Ligne droite : (s, −d) = (x, y) depuis l'ancre, la jupe droite part comme en 0.5.0. Jupe
  cercle : cône déroulé, ceinture à la taille.
- **Pantalon jambe par jambe** (tube de chaque jambe, devant et dos ensemble). Sous `crotch`, le milieu de l'isoligne
  de la pièce va au point extrême avant ou arrière de la coupe de la jambe (et non plus l'ancre) ; au-dessus de
  `crotch` + 50 mm, le bout de l'isoligne côté milieu du corps (bord cousu à une pièce de l'autre côté : montant,
  fourche) va au milieu devant ou dos de la demi-coupe du bassin ; entre les deux, l'abscisse de départ est
  interpolée linéairement. Écarté : coudre d'abord chaque jambe puis la fourche (les coutures de fourche se ferment
  déjà : les échecs viennent du départ).
- **Corsage et manches : repli sur l'épaule.** Au-dessus de `shoulder` − 40 mm, la partie d'une pièce `torso` est
  couchée le long du profil sagittal du corps (coupe par le plan x = x du sommet, sans les bras, enveloppe convexe
  décalée de `clearanceMm`), depuis la face regardée, de l'excédent de hauteur : les épaules partent au-dessus de
  l'épaule et se ferment sans traverser le corps. Manches : posées le long de l'axe du bras comme aujourd'hui, haut
  de manche tenu sur cet axe. **Angle des bras** : le moteur ne change jamais l'avatar demandé ; les essais et
  critères des corsages se font à `armAngleDeg` 30, et le studio demande un drapé avec 30° et l'affiche avec les
  options du drapé (tâche front à part). À 9°, un corsage rend un succès conforme ou un problème typé, jamais un faux
  succès. À revoir si 9° tient les critères après 1.19e2c.
- **Réglages par qualité, pas par type de vêtement** (un tableau par type masquerait les défauts et grandirait avec
  chaque modèle) : `DRAPE_SETTINGS` garde pas de 1/60 s, 10 sous-pas, couture 30 / 45 pas, itérations 4 / 6,
  gravité de couture 0,1, et ajoute `holdReleaseSteps` 30 / 45 ; `maxSteps` passe à 400 en brouillon (600 en
  standard, `MAX_STEPS_LIMIT` 1 000 inchangé). Écartés : gravité nulle pendant la couture (sans effet mesuré),
  tenue permanente (masquerait un vêtement trop large).
- **Critères** (brouillon, mesures fictives des références, popeline ; un test chacun ; corsages à 30°) : pour les
  cinq vêtements, `ok`, `converged` en 400 pas au plus, pénétration (parité) ≤ 3 mm, écart de couture ≤ 2 mm,
  `ease.minMm` ≥ −3 mm − épaisseur. Jupe droite : critères de 1.19e inchangés (aisance médiane au bassin 0 à
  25 mm). Taille finale (médiane des sommets `waistline`) entre `waist` − 40 et `waist` + 10 mm pour les jupes (jupe
  cercle : bas de ceinture), `waist` − 60 et `waist` + 10 pour le pantalon. Jupe cercle : coutures à moins de 120 mm
  au départ (aujourd'hui 227 à 971) ; rayon horizontal médian de l'ourlet au moins 1,5 fois celui de la hanche (le
  volume ne s'effondre pas). Pantalon : côté et entrejambe à moins de 120 mm au départ ; à la fin, sommets des pièces
  gauches à x > −10 mm et droites à x < 10 mm sous `crotch` (pas de jambe croisée). Corsage : coutures d'épaule à
  moins de 80 mm au départ ; points d'épaule finaux entre `shoulder` − 20 et `neck` + 20 mm ; bas à `waist` ± 40 mm.
  Manches : haut de manche final à moins de 40 mm de l'épaule le long de l'axe. Seuils mesurés une fois : les changer
  demande une ligne ici.
- **Budget** : temps CPU relatif (`costRatio`) en brouillon ≤ 20 par vêtement, ≤ 30 pour la jupe cercle (le plus
  gros) ; mesuré aujourd'hui de 1,1 à 9 s par vêtement. Absolu : 15 s en brouillon, 60 s en standard (borne de
  l'architecture 5.4), standard mesuré à la main à chaque `ENGINE_VERSION` et noté dans la page du composant. Les
  tenues coûtent peu (quelques centaines contre 7 000 arêtes). Un drapé par vêtement et par fichier de test, partagé
  par ses critères ; déterminisme vérifié sur la jupe droite seulement.
- **Problème `invalid-input`** (patron refusé par le maillage) : publié comme `/problems/drape-internal`, `designs`
  validant la demande en amont ; contrat inchangé.
- **Découpage, dans cet ordre, une tâche à la fois dans `engines/drape`** (mêmes fichiers ; `ENGINE_VERSION`
  mineure à chaque) : 1.19e2a (mesure de pénétration, tenues dans le cœur, ligne d'ancrage, ceinture et jupe cercle ;
  en deux demandes de fusion si plus de 400 lignes), 1.19e2b (pantalon jambe par jambe), 1.19e2c (repli sur
  l'épaule, coutures d'épaule et manches tenues, corsages à 30°). Interface partagée : `ClothMesh.holds` et
  `SimulationSettings.holdReleaseSteps` sont des ajouts facultatifs.

**Jupe cercle : départ en godets, double passe de couture, petits pas pour un tube très évasé (1.19e2a3,
03/10/2026, décision de l'orchestrateur sur proposition de l'architecte).** Constats, mesurés sur des copies
construites du moteur (0.7.0, et 0.8.0 pour le pantalon) hors du dépôt : brouillon, mesures fictives des références,
popeline.

- **Le départ de la jupe cercle n'est pas isométrique.** La pièce est posée en cône (hauteur = repère − d, courbe
  agrandie de λ jusqu'au tour fini) : chaque rayon du patron part allongé d'environ √2, et l'arrondi des niveaux joint
  à l'agrandissement déchire le maillage. Allongement des arêtes au départ : médiane +24 %, 95ᵉ centile +222 %,
  extrêmes −100 % et +550 % (jupe droite : médiane 0, 95ᵉ centile ≤ 11 %). La couture referme un maillage froissé.
- **Aucun réglage ne rattrape ce départ.** Avec 30 sous-pas (essai de 1.19e2a2 : convergé, coutures à 1,1 mm), ou avec
  60 sous-pas, 1 itération et une double passe de couture (convergé, coutures à 0,01 mm, pénétration nulle, ceinture
  à −9 mm), l'ourlet finit à 230 à 280 mm sous la taille pour une jupe de 650 mm, avec un rayon de 1,07 à 1,15 fois
  celui de la hanche : la jupe est remontée en accordéon. Sans le critère d'ourlet, ce serait un faux succès.
- **Avec un départ quasi isométrique** (jupe pendante, godets déjà formés, essai propre à la jupe cercle), la jupe
  pend à sa longueur (ourlet à −736 mm) sans pénétration à 30°, mais la ceinture porte alors tout le poids de la
  jupe (≈ 210 g sur 650 mm) : à 10 sous-pas × 4 itérations, elle descend à −88 mm, s'allonge de 12 % (haut) à 25 %
  (bas) et les coutures restent ouvertes de 11 mm. La position de la ceinture suit à peu près sous-pas² × itérations
  (il en faut ≈ 2 400 pour tenir −40 mm), le coût suit sous-pas × itérations : 20 × 6 donne −41 mm, 30 × 4 −33 mm,
  50 × 1 −38 mm et 60 × 1 −27 mm.
- **L'écart de couture restant est un artefact de l'ordre de résolution.** Il tient au raccord des quatre pièces
  (deux de jupe, deux de ceinture) en haut des coutures de côté, soit un cycle de quatre coutures au point le plus
  chargé. Une seconde passe de coutures dans chaque itération le ramène de 1,7–3,4 mm à 0,01 mm, quel que soit le
  réglage. Sur le pantalon (0.8.0) et la jupe droite, elle ne change aucun critère (pantalon : 132 pas, coutures 0,
  taille −30 mm ; coûts 9,9 et 6,0).
- **Un réglage global plus fin casse le pantalon.** À 50 × 1, il ne converge plus en 400 pas ; à 60 × 1, il
  converge (130 pas) mais coûte 21,5, au-delà de son seuil de 20.
- **Mesures du coût (`costRatio`)**, départ en godets, 30°, double passe : 50 × 1 donne 24,6 à 25,1 (critères
  tenus : 193 pas, coutures 0,02 mm, pénétration 0, ceinture −37,6 mm, ourlet 1,54 fois la hanche) ; 60 × 1 donne
  26 à 41, dispersé (209 pas, −27,3 mm, 1,62) ; 40 × 2 donne 30,7 (−33,7 mm, 1,73). Jupe cercle actuelle, en
  échec : 23,6. En standard (9 756 sommets), 60 × 1 prend 158 s et ne converge pas en 600 pas.
- **Bras.** À 9°, l'avant-bras traverse le volume de la jupe, au départ actuel (13 mm) comme au départ en godets
  (15,8 mm) ; à 30°, la pénétration est nulle.

Décision :

- **Départ en godets pour les tubes `torso` évasés** (à la place de l'agrandissement λ de `place-garment.ts`). Il
  s'applique sous l'ancre, aux niveaux où le tour fini dépasse la courbe du corps décalée de plus de 5 %. La courbe
  du niveau garde sa taille (enveloppe cumulée, jamais agrandie) ; l'excédent de longueur est plissé en ondes
  radiales vers l'extérieur, de profil `16u²(1 − u)²` sur chaque godet. Chaque pièce porte un nombre entier de godets,
  un par 150 mm de sa part de courbe au niveau le plus large, au moins un, avec un creux à chacun de ses bouts, là où
  sont les coutures. L'amplitude de chaque niveau est trouvée par dichotomie bornée (40 tours), pour que la longueur
  de la courbe ondulée égale le tour fini. L'abscisse d'un sommet se prend le long de la courbe ondulée, d'où une
  isoligne posée à sa longueur. Sa hauteur est repère − ∫ √(1 − (dr/dd)²) dd, r étant la distance moyenne du niveau
  au centre : la pente radiale est retirée. La position est interpolée entre deux niveaux, au lieu de l'arrondi au
  niveau. Le tout reste en `+ − × ÷` et `Math.sqrt`, en ordre fixe, sans trigonométrie. Les jambes et les bras ne
  changent pas ; la jupe droite non plus (son tour fini ne dépasse pas la courbe).
- **Double passe de couture**, pour tous les vêtements : `solveStitches` est appelé deux fois de suite à chaque
  itération, avant les tenues. Le coût est négligeable, car les couples de couture sont environ 30 fois moins
  nombreux que les arêtes.
- **Petits pas pour un tube très évasé.** Si le départ a plissé un niveau d'au moins 1,5 fois (tour fini / courbe),
  la simulation prend 50 sous-pas et 1 itération (Macklin et al. 2019) ; le reste des réglages de la qualité ne
  change pas. Le critère est une propriété mesurée de la mise en place, pas un type de vêtement : c'est le tissu
  suspendu sans appui sur le corps qui charge la ceinture et demande un solveur plus précis. La jupe droite, le
  pantalon et les corsages n'y entrent pas, leurs réglages et leurs critères ne bougent pas. Passer à 60 × 1 est
  permis seulement si 50 × 1 ne tient pas un critère avec le départ réel ; le budget de la jupe cercle passe alors à
  40, avec une ligne ici. `DRAPE_SETTINGS` garde ses deux qualités et y ajoute le réglage fin (`flare`).
- **Bras** : les critères de la jupe cercle se mesurent à `armAngleDeg` 30, comme pour les corsages (le studio
  demande le drapé à 30°). À 9°, le résultat est un succès conforme ou un problème typé, jamais un faux succès. Le
  moteur ne change pas l'avatar demandé.
- **Critères de la jupe cercle** (brouillon, 30° ; un test chacun) : ceux de l'ADR (`ok`, convergé en 400 pas au plus,
  pénétration ≤ 3 mm, coutures ≤ 2 mm, bas de ceinture entre `waist` − 40 et `waist` + 10 mm, rayon de l'ourlet ≥ 1,5
  fois celui de la hanche, `costRatio` ≤ 30), précisés et complétés :
  - le rayon de l'ourlet est la médiane des distances horizontales des sommets des bords `hem` à leur centroïde (x,
    z), celui de la hanche vaut `hipGirthMm` / 2π ;
  - nouveau, **chute de l'ourlet** : la hauteur médiane des sommets `hem` est au plus le bas de ceinture − 0,8 ×
    la longueur à plat de la jupe (taille → ourlet, 650 mm). Mesuré : 0,86 à 0,89 avec un bon départ, 0,41 pour la
    jupe froissée ;
  - nouveau, **départ** : au 95ᵉ centile, l'allongement des arêtes au départ (en valeur absolue) est d'au plus 25 %
    (essai : 21 %, aujourd'hui 222 %), et les coutures restent à moins de 120 mm.
    Les vêtements sans godets gardent un départ identique au bit près, ce qui se vérifie sur la jupe droite et le
    pantalon.
- **Écartés** :
  - réglages par type de vêtement (principe de « Maintien » maintenu) ;
  - sous-pas plus nombreux pour tous les vêtements : le pantalon ne converge plus ou sort de son budget, et la jupe
    droite coûte 2 à 3 fois plus pour un résultat identique ;
  - plus d'itérations seulement : 4 → 8 laisse la ceinture à −67 mm, quand doubler les sous-pas, pour le même coût,
    la met à −47 mm ;
  - ceinture plus raide (droit fil, entoilage) : un tissu dix fois plus raide donne le même résultat (−89 mm). La
    souplesse XPBD d'une arête est déjà environ 2 000 fois plus petite que l'inverse de la masse d'un sommet : seule
    la convergence compte ;
  - limite d'allongement de la ceinture, contrainte globale sur la longueur d'une chaîne : la collision, résolue
    après, ré-élargit l'anneau, et la ceinture finit à −68 mm ;
  - tenue de ceinture gardée en fin de drapé : elle masquerait une taille trop large (décision « Maintien ») ;
  - appui par frottement : le frottement existe déjà, c'est l'anneau trop souple qui descend ;
  - multigrille : juste en principe, mais une tâche à part, à reconsidérer pour le standard ;
  - départ en disque horizontal (isométrique) : les bras le traversent à 9° comme à 30° ;
  - panneaux plans : les coutures de côté se ferment à travers les bras.
- **Standard** : le réglage fin s'applique aussi, mais la jupe cercle y dépasse la borne de 60 s (158 s mesurés à
  60 × 1). C'est une limite connue, à noter dans la page du composant. Une tâche de performance s'ouvre
  (multigrille, ou maillage plus grossier pour la partie suspendue) ; en attendant, le studio demande le brouillon.
- **Découpage** : une tâche dans `engines/drape` (1.19e2a3), après la fusion de 1.19e2c, car les fichiers et
  `ENGINE_VERSION` sont les mêmes ; version mineure suivante.
