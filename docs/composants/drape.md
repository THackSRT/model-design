--8<-- "engines/drape/AGENTS.md"

## Structure détaillée

### API et entrées

`src/index.ts` : API compatible navigateur (importée par le studio, son Worker et le banc d'essai) : `simulate`,
`meshGarment`, `FABRIC_PRESETS`, `toXpbdParams`, types, constantes, `ENGINE_VERSION`. Aucun `node:*` ni
`@atelier/mannequin` n'y est atteignable (`test/browser-entry.test.ts` parcourt ses imports statiques).

`src/node.ts` (exports `./node`, `@atelier/drape/node`) : entrée réservée à Node : `loadAvatarEngine`, `buildAvatar`,
`buildBody`, `weldBody`, la mise en place (`placeGarment`, `assertPlacements`, `keepClearOfBody`, `PlacementError`) et
`drapeGarment`. Serveur du moteur et tests de drapé l'importent ; jamais le navigateur. `src/server.ts` + `src/main.ts`
: `GET /health` (`{ name: "drape", version }`), `node:http`, port `PORT` ou 8000.

### Core — calcul pur et déterministe

`src/core/` : cœur pur et déterministe (ni E/S, ni horloge, ni hasard ; mm, g, s ; axe Y vers le haut). Le lint
(`eslint.config.mjs`) interdit à `src/core/` d'importer `node:*`, `adapters/`, `output/`, `body/`. Hors du cœur :
`src/body/` (fait, 1.19e : avatar par `@atelier/mannequin`, cm → mm ici seulement) ; à venir : `src/output/` (glTF,
mètres ici seulement), `src/adapters/` (NATS, stockage).

- `types.ts` : `ClothMesh`, `BodyMesh`, `FabricPhysics`, `SimulationSettings`, `SimulationResult` (interface partagée
  avec 1.19d : ne pas la changer sans le signaler ; `iterations?` est un ajout facultatif : entier de 1 à
  `MAX_ITERATIONS` = 32, 1 par défaut) ;
- `validate.ts` : validation des entrées avant toute simulation ; `InvalidInputError` (sous-classe de `RangeError`, `code`
  `'mesh'` ou `'settings'`) pour indices de triangles (tissu, corps), coutures et sommets fixes hors bornes, non entiers
  ou triangle dégénéré, `iterations` hors bornes ;
- `fabric.ts` : préréglages (valeurs ESTIMÉES, à faire valider) et conversion des unités physiques vers les raideurs XPBD
  (`toXpbdParams`, formules commentées) ; statut des préréglages (`FABRIC_PRESET_STATUS`, `'estimated'` | `'validated'`,
  tous estimés aujourd'hui), `resolveFabric` (tissu du contrat → `FabricPhysics`, la surcharge l'emporte) et
  `isFabricEstimated` (base de `DrapeResult.fabricEstimated`, tâche 1.19e : vrai si préréglage estimé et au moins une des
  six propriétés non surchargée) ;
- `topology.ts` : masses, arêtes d'étirement (raideur `k = K(θ)·A/l²`, interpolée entre chaîne et trame par cos² de
  l'angle au droit fil), stencils de flexion isométrique (Bergou 2006, `k = D/(A0+A1)`) ;
- `constraints.ts` : passes de Gauss-Seidel (étirement, flexion, coutures) avec multiplicateurs de Lagrange λ remis à zéro
  à chaque sous-pas et cumulés sur ses itérations (XPBD, terme `α̃·λ`) ; `simulate.ts` : boucle (petits pas, phase de
  couture à gravité réduite, arrêt au repos : vitesse max sous le seuil pendant 10 pas) ;
- `body-grid.ts`, `body-query.ts`, `triangle-distance.ts`, `collision.ts` : collision sommet-triangle contre un corps
  fermé (normales vers l'extérieur par l'ordre des sommets), grille de hachage spatiale, frottement de Coulomb
  positionnel ; `damping.ts` : amortissement des modes non rigides.

### Bench — essais d'atelier

`src/bench/` (ADR 0015, tâche 1.39b) : essais d'atelier, fonctions pures hors du cœur déterministe (`Math.tan`, `sin`,
`cos`, `atan2` permis ; même règle d'imports que `src/core`, `node:*` interdit). `workshop.ts` : conversions des mesures
brutes (`FabricBenchMeasurements`) en grandeurs (`deriveFabricValues`, `stripStretch`, `bendingLengthMm`,
`bendingRigidityMicroNm`, `frictionFromSlideAngles`, g = 9,81 m/s²) ; `compare.ts` : tolérances (`BENCH_TOLERANCES`),
écarts (`compareToEstimate`), valeurs candidates (`candidateFabric`). Entrée invalide : `RangeError` (le consommateur
valide avant d'appeler). Dépend de `@atelier/contracts-ts` (types seulement) ; condition d'export `source` pour
Vitest/Vite. Tolérances incluses malgré la virgule flottante : `TOLERANCE_EPSILON` = 1e-9 (`compare.ts`).

Essai de drapé de Cusick simulé (tâche 1.39f) : `cusick-mesh.ts` (`buildCusickTest` : éprouvette de 300 mm en anneaux,
arête 5 / 7,5 / 10 / 15 mm, sommets à r ≤ 90 mm fixes, départ à plat au-dessus d'un disque de 180 mm avec une
perturbation déterministe en y ; 300 pas, 20 sous-pas), `projected-area.ts` (aire de l'ombre par carte binaire de
cellules de 1 mm, plis comptés une fois), `cusick.ts` (`drapeCoefficient`, `shadowOutlineMm`, `runCusickTest`). DC =
(ombre − disque) / (éprouvette − disque), borné à [0, 1], au millième ; l'aire de l'éprouvette est celle du maillage
(polygone : 99,8 % du disque à 15 mm, plus de 99,9 % à 10 mm et moins). Mesures (poste de développement, charge
variable) : 7,5 mm, 0,75 à 2 s (silk-satin 0,305, cotton-poplin 0,396, denim 0,739 non convergé en 300 pas) ; 10 mm,
0,2 à 1,9 s.

### Mesh — maillage triangulaire

`src/mesh/` (ADR 0013, tâche 1.19d1) : maillage triangulaire à plat d'une pièce de patron (`Panel` du contrat, mm, y vers
le haut). Pur et déterministe, même règle d'imports que `src/core` (`node:*`, adaptateurs interdits) ; `Math.sqrt`,
`hypot` et les opérations de base seulement (pas de `sin`/`cos` : Bézier par De Casteljau), `Math.sqrt` justifié par les
longueurs d'arête. Hors du chemin de simulation, mais mêmes entrées, mêmes bits. Les erreurs de contour (non fermé, bord
sans longueur, croisement, points confondus) sont des `InvalidInputError` de code `'mesh'`.

- `limits.ts` : `MeshQuality` (`draft` | `standard`, noms du contrat), `MESH_EDGE_MM` (25 / 15 mm), `MAX_EDGES_PER_GARMENT`
  = 2 000, `MAX_VERTICES_PER_GARMENT` = 30 000, `DrapeTooLargeError` (sous-classe de `RangeError`, `code` = `'drape-too-large'`)
  et `assertWithinDrapeLimits(edgeCount, vertexCount)` (1.19d2 l'appelle avec les totaux du vêtement ; `meshPanel` l'applique
  déjà à la pièce) ;
- `outline.ts` : `flattenPanelOutline(panel, edgeMm)` → `{ pointsMm, edgeStarts }` ; chaque bord est découpé en parts égales
  (en abscisse curviligne pour les Bézier) de `edgeMm` environ, jamais plus de `MAX_EDGE_RATIO` = 1,2 h ; un bord courbe
  reçoit plus de parts tant que la flèche des cordes dépasse `FLATNESS_RATIO` · h = h/20 (le contour est la ligne brisée,
  ses sommets sont sur la courbe) ;
- `lattice.ts` : points intérieurs, réseau triangulaire de pas h ancré au coin bas-gauche de la boîte englobante, gardés
  s'ils sont dans le contour (pair-impair) et à plus de h/2 du bord ;
- `triangulation.ts`, `constrain.ts`, `refine.ts`, `build.ts` : triangulation de Delaunay contrainte. Insertion incrémentale
  dans un triangle englobant (20 fois la boîte) avec retournements de Lawson (équivalent de Bowyer-Watson, mais robuste aux
  points cocycliques du réseau : seuil `1e-9·h⁴` sur le test du cercle, aucun hasard ; signe de position antisymétrique au
  bit près), puis récupération des arêtes de contour manquantes par retournements (Sloan), puis retrait des triangles hors
  de la pièce (parcours depuis le triangle englobant, la parité change à chaque arête de contour franchie : même résultat que
  le test pair-impair du centre de gravité, en O(n)). Enfin les arêtes intérieures de plus de 1,2 h reçoivent un sommet en
  leur milieu (au plus 8 passes) : sans cela le réseau laisse des arêtes jusqu'à 1,6 h le long des bords. Pièce simple
  seulement (un contour, pas de trou).
- `panel-mesh.ts` : `meshPanel(panel, quality)` → `PanelMesh` (`positionsMm` x, y à plat ; `triangles` antihoraires ;
  `boundary[i] = { edgeIndex, vertexIndices }`, du début (`from`) à la fin (`to`) du bord i du contrat, extrémités comprises
  ; la fin d'un bord est le début du suivant, le dernier bord finit au sommet 0). Les sommets du contour sont les premiers,
  dans l'ordre des bords ; ceux du réseau et du raffinement suivent.
- Qualité mesurée (rectangle, jupe droite) : arêtes ≤ 1,2 h, angle minimal ≥ 29 degrés sur les rectangles, ≥ 24 degrés sur
  la jupe ; jupe droite complète en qualité standard : 0,1 s CPU environ (845 à 940 sommets par pièce) ; panneau de 15 000
  sommets : 1,6 s. Le test de performance exige moins de 1 s pour la jupe.

Vêtement entier à plat (tâche 1.19d2) : `meshGarment(spec, quality): GarmentMesh` (`garment-mesh.ts`). `GarmentMesh` =
`{ cloth: ClothMesh, pieces, vertexPiece, vertexEdge, seams }` ; `cloth` : x, y de la pièce (y vers le haut), z = 0,
`flatMm` = x, y de `positionsMm`, pièces côte à côte de gauche à droite (`PIECE_GAP_MM` = 50), `pinned` absent, `validateCloth`
appliqué. `pieces[k]` : `{ panelId, copy: 0 | 1, side, unfolded, mirrored, vertexStart, vertexCount, triangleStart,
triangleCount }` (une primitive glTF par entrée ; sommets et triangles contigus) ; `vertexPiece[v]` : index dans `pieces` ;
`vertexEdge[v]` : index dans `panel.edges` du contrat du bord que le sommet commence ou dont il est un point intérieur, -1
à l'intérieur (la moitié symétrique d'une pièce dépliée renvoie au bord d'origine) ; `seams[k]` (`SeamReport`) : `{ seamId,
sideA, sideB, lengthAMm, lengthBMm, easeMm, mismatchMm, stitchStart, stitchCount }`, une entrée par couple de bords
cousus (une couture du contrat en donne 1 ou 2, dans l'ordre des coutures) ; `mismatchMm` = |longueur a − longueur b −
embu| (plus de quelques mm : 1.19e signale `seam-not-closed`). Erreurs : `InvalidInputError('mesh')` (quantité hors 1 ou 2,
`cutOnFold` sans bord `fold` unique et droit, `cutOnFold` avec quantité 2, bord inconnu ou bord `fold` cousu, copies
ambiguës) ; `DrapeTooLargeError` (plus de `MAX_PANELS_PER_GARMENT` = 40 pièces, 2 000 bords ou 30 000 sommets, copies
comprises).

- `unfold.ts` : `unfoldPanel` : symétrie sur la droite du bord `fold` ; contour = bords d'origine sans le pli, puis les
  symétriques en ordre inverse (de/vers échangés), points du pli repris à l'identique : sommets du pli uniques ; `edgeOrigin`
  garde le bord d'origine de chaque bord du contour.
- `copies.ts` : `planPanel` (côté dessiné `drawnSide` : `bodySide` ; `center` + pliure : selon que la moitié dessinée est à
  droite ou à gauche du pli, de face la gauche du porteur est à droite de la page, de dos et `outer` à gauche ; `center` -
  `quantity: 2` : `right` ; sans `placement` : `center`), copie miroir (x → −x, deux sommets de chaque triangle échangés pour
  rester antihoraires), droit fil unitaire par triangle (vertical sans `grainline` ; moitié symétrique d'une pièce dépliée
  : symétrique du droit fil sur le pli, selon le barycentre ; copie miroir : x change de signe).
- `seams.ts` : résolution par exemplaire. Chaque bord du contrat a un exemplaire par côté (pièce dépliée : un par moitié ;
  `quantity: 2` : copie 0 du côté dessiné, copie 1 de l'autre). `EdgeRef.side` filtre ; deux exemplaires uniques s'apparient
  (quel que soit le côté, ex. dos droit / dos gauche) ; deux bords à deux exemplaires : gauche-gauche et droite-droite ; un
  bord à deux exemplaires et un unique : la copie du côté de l'unique (`center` : erreur, utiliser `side`). Sens : celui du
  parcours antihoraire une fois posé (les moitiés symétriques d'une pièce dépliée sont déjà dans ce sens dans le contour ;
  la copie miroir de `quantity: 2` est parcourue à l'envers) ; le point de rang i de `a` est cousu au point de rang n − i de
  `b` ; un couple de sommets confondus (pointe de pince) est omis. Même nombre de points : `seamSegmentCounts` relie de
  proche en proche les bords cousus (un bord à plusieurs coutures, ou dont la copie miroir partage le maillage, relie leurs
  partenaires) ; chaque groupe reçoit n = ceil(plus grande longueur / h) parts, ou plus si un bord courbe l'exige
  (`edgeSampling`) ; un bord sans couture garde son pas naturel. `meshPanel(panel, quality, { edgeSegments })` applique ce
  nombre à des bords du contour.

Mesuré (poste de développement, CPU) : standard, 0,02 à 0,17 s par vêtement ; jupe droite 3 480 sommets, jupe cercle 9 756
(le plus gros), pantalon 6 118, corsage 2 189, corsage à manches 3 570 ; draft : 1 364, 3 644, 2 429, 912, 1 473.

Fixtures `test/fixtures/*.json` : copies des références golden du moteur de patronage (jupe droite, jupe cercle, pantalon,
corsage avec et sans manches) ; ne pas les modifier ici.

Entrées du réseau (1.19g) : rien ne doit tourner sans fin ni allouer sans borne. Coordonnées (bords, contrôles, droit fil)
finies et d'au plus `MAX_COORDINATE_MM` = 10 000 mm sinon `InvalidInputError('mesh')` (aussi pour un contour déplié) ;
`MAX_SEAMS_PER_GARMENT` = 200 coutures (10 fois la plus grosse référence). Les refus de taille précèdent le travail coûteux
: somme des bords du vêtement, puis par bord ceil(longueur / h) et comptes imposés contre le budget de sommets restant, puis
estimation aire (lacet) / (√3/2·h²) + points du contour, puis candidats du réseau × points du contour au plus
`MAX_LATTICE_WORK` = 5e7, puis comptage dans la boucle du réseau et du raffinement. `meshGarment` passe à `meshPanel` le
budget restant (`maxVertices`, divisé par le nombre d'exemplaires). Boucles géométriques sur indice entier (`x0 + i·h`),
`Math.sqrt` à la place de `Math.hypot`. Test : `mesh-hardening.test.ts` (dont fixtures identiques octet pour octet aux
références golden du patronage).

### Body — avatar et soudure

`src/body/` (1.19e, seul à importer `@atelier/mannequin`, exception de dépendance déclarée dans `eslint.config.mjs` pour
`src/body` et `test/`) : `loadAvatarEngine(loadBytes?)` (asynchrone, une fois ; par défaut lit `makehuman.mhz` du paquet),
puis `buildAvatar(measurements, avatarOptions): AvatarShape` (synchrone, 0,5 à 1 s) et `buildBody` (le seul `BodyMesh`).
`weld.ts` : cm → mm (seule conversion du moteur) et soudure des sommets dédoublés aux coutures UV. Constat : après soudure
(13 524 sommets), le maillage MakeHuman ajusté est fermé (chaque arête orientée a son opposée, aucun bord) et ses normales
sont sortantes (volume signé positif), mains et pieds compris : la collision de l'ADR 0013 s'applique telle quelle. Le
corps est symétrique autour de x = 0 ; x > 0 = gauche du porteur.

### Placement — enroulement

`src/placement/` (1.19e, pur : mêmes imports interdits que `src/core`) : chaque exemplaire de pièce est enroulé autour de
la coupe du corps à la hauteur de son repère (`placement.anchor`, plus `offsetMm`), décalée de `clearanceMm`. `section.ts`
coupe le maillage par un plan (composantes connexes) ; `select.ts` choisit les points (tronc sans les bras, une jambe, un
bras ; une coupe qui réunit les jambes est coupée en deux sur x = 0) ; `hull.ts` : enveloppe convexe, courbe décalée (coins
arrondis par pas de 20 degrés, sans trigonométrie), abscisse curviligne ; `levels.ts` : une pile de niveaux tous les 5 mm
autour de l'ancrage (tronc : enveloppe cumulée depuis l'ancrage, elle ne rétrécit jamais, donc une jupe ancrée à la taille
enveloppe les hanches ; jambe et bras : coupe du niveau) ; `place-garment.ts` : l'abscisse de la pièce (x moins l'ancre,
`shiftXMm` de `GarmentPiece` retiré) devient l'abscisse curviligne dans le sens horaire vu d'en haut (de face comme de dos),
depuis le milieu de la face (`facing`), la hauteur de la pièce devient la hauteur sur le corps (bras : le long de son axe).
`widths.ts` : tour fini du tube à chaque hauteur ; si le tour fini dépasse la courbe, elle est agrandie (λ, jupe évasée)
pour que les exemplaires tiennent côte à côte ; sinon les coutures de côté partent écartées (jusqu'à ≈ 100 mm sur la jupe
droite). `clearance.ts` : aucun sommet à moins de 3 mm du corps au départ (repoussé le long de la normale, au plus 100 mm
sinon `placement-failed`). `assertPlacements` : `placement-missing`. `PlacementError` (`code`, `panelId`, jamais de mesure).

Limites : pantalon et manches posés au mieux (jonction au niveau de l'entrejambe discontinue ; manche = coupe autour de
l'axe du bras, rayon ≤ 150 mm) ; corsage sans maintien (rien ne le retient aux épaules) : il tombe.

### Drape — orchestration

`src/drape/` (1.19e) : `drapeGarment(job: DrapeJob, { maxSteps? }): DrapeOutcome`. Ordre : placements, `meshGarment`, avatar,
`placeGarment`, `keepClearOfBody`, `simulate` (réglages `DRAPE_SETTINGS` par qualité : pas de 1/60 s, 10 sous-pas, couture 30
/ 45 pas, itérations 4 / 6, au plus 300 / 600 pas, borne dure `MAX_STEPS_LIMIT` = 1 000 ; une itération par sous-pas laissait
la jupe glisser de 90 mm et s'allonger de 95 %), indicateurs (`metrics.ts`). Succès : `{ ok: true, result: DrapeResultCore,
positionsMm: Float32Array (0,1 mm), easeMm, strain (fraction, max des arêtes du sommet), mesh: GarmentMesh, diagnostics }` ;
`DrapeResultCore` = `DrapeResult` sans `modelKey`, `sizeBytes`, `sha256` (1.19f). Aisance = distance signée au corps moins
l'épaisseur (au-delà de 60 mm : distance au sommet du corps le plus proche) ; `tightAreaMm2` = surface (tiers des triangles)
des sommets d'aisance ≤ 3 mm. Échec : `{ ok: false, problem: { type, panelId? } }`, `type` = `placement-missing`,
`placement-failed`, `seam-not-closed` (écart de couture plus de 2 mm), `body-penetration` (plus de 3 mm), `drape-too-large`,
`invalid-input` (patron refusé par le maillage). Une autre erreur est un bogue et se propage.

Mesuré (poste de développement) : jupe droite en brouillon (1 364 sommets) : avatar 0,6 s, mise en place 0,3 s, simulation
3 à 4 s, 116 pas, convergée, pénétration 0, écart de couture < 0,01 mm, aisance au bassin ≈ 6 mm (patron : 4 mm),
allongement maximal 25 % (taille sur les hanches, autour des pinces). Test de coût : `costRatio` 4,5 à 9, seuil 20. Écart
moyen de position avec l'habillage géométrique 1.34a : 32 mm, seuil 50 mm (les deux ne visent pas la même chose : le drapé
tombe et se serre, l'habillage est un tube à tour fini). Hors jupe droite (draft, mesures de la référence) : jupe cercle
`seam-not-closed` (18 s), pantalon `seam-not-closed`, corsage `body-penetration`, corsage à manches converge (écart de
couture 1,3 mm, aisance minimale −60 mm) : à reprendre (maintien du vêtement, ceinture, pantalon par jambe).

### Validation des tissus — ADR 0015

Appliquer un rapport de validation des tissus (ADR 0015) : pour chaque revue `corrected`, remplacer les valeurs de
`FABRIC_PRESETS` par celles de `corrected` ; mettre `'validated'` dans `FABRIC_PRESET_STATUS` pour les verdicts `validated`
et `corrected` ; `to-review` ne change rien ; monter `ENGINE_VERSION` (mineure) ; ajouter une ligne au `CHANGELOG.md` ;
garder le rapport appliqué hors du dépôt s'il contient un commentaire libre (aucune donnée personnelle dans le dépôt).
Mettre à jour le test « aucun préréglage validé » de `test/fabric-status.test.ts`.

### Tests et performance

Tests de performance : budgets RELATIFS (`costRatio` dans `test/helpers.ts`) : temps CPU du cas divisé par celui d'une charge
de référence fixe (40 × 40 sommets sur sphère, 30 pas, ≈ 0,55 s au repos) mesurée juste avant et après dans le même
processus, car le temps CPU gonfle sous contention (`pnpm check`). Seuils k, ×2 environ sur le rapport au repos : sphère 70 ×
70 : 25 (mesuré 11–13) ; Cusick 10 mm : 4 (1,5–1,9) ; jupe : 0,12 (0,05) ; plus gros vêtement : 0,6 (0,05–0,30) ; refus du
maillage : 0,1 ; budget restant : 0,2. Borne absolue 60 s.

Déterminisme au bit près : `Float64Array`, ordre fixe, un seul fil, seulement `+ − × ÷`, `Math.sqrt`, `abs`, `min`, `max`
(et `Math.floor` pour la grille) ; ni `sin`, `cos`, `exp`, `pow` dans le cœur. Changer un calcul : changer `ENGINE_VERSION`.

Les fonctions chaudes lisent les tableaux par deux petits utilitaires locaux à chaque module (`f`, `u`) : les importer d'un
autre module ralentit d'un facteur 6 sous Vitest (accès indirect aux imports).

Limites connues : une itération par sous-pas par défaut (« petits pas ») sous-estime la raideur des chaînes très raides ou
très longues (régler `substeps` / `iterations?`) ; l'anisotropie chaîne/trame est interpolée par arête, donc approchée (écart
mesuré : environ 10 % pour un rapport 1,25 entre les deux sens, 25 % pour un rapport 2) ; pas d'auto-collision du vêtement ;
la capture des collisions est limitée à 8 mm au-delà de la distance de contact (pas de traversée tant que la vitesse reste
sous environ 4 m/s).

Tests (`test/`, Vitest) : déterminisme, chute libre, bande suspendue (étirement), porte-à-faux (flexion, solution exacte de
l'élastique pesant dans `elastica.ts`), sphère, plan incliné, coutures, performance (70 × 70 sommets en moins de 10 s),
conversions, `/health`, maillage de pièce (`avatar.test.ts`, `not-loaded.test.ts`, `placement.test.ts`, `drape-skirt.test.ts`
: avatar, mise en place, drapé de la jupe droite, cohérence avec 1.34a ; `mesh-*.test.ts` : rectangle, pièces en L et à pince,
bord courbe, correspondance des bords, déterminisme, limites, jupe droite de `test/fixtures/straight-skirt.json`, copie de la
référence du moteur de patronage ; `mesh-garment*.test.ts` : coutures, pliure, exemplaires, limites, cinq références golden en
draft et standard, déterminisme, performance).

Modèle à suivre : `engines/mannequin`.

### Sorties — glTF, clé de cache, événements (1.19f1)

`src/output/` (réservé à Node : `node:crypto` ; exporté par `src/node.ts` seulement, l'entrée `.` reste compatible
navigateur). Aucune E/S : NATS et S3 sont l'objet de 1.19f2.

- `piece-arrays.ts` : tableaux d'un exemplaire de pièce. Positions mm / 1000 (mètres, seule conversion avec les
  coordonnées de texture), indices rendus locaux (global moins `vertexStart`), normales de sommet par somme des normales
  de face pondérées par l'aire, `TEXCOORD_0` = coordonnées à plat en mètres dans le repère de la pièce (x moins
  `shiftXMm`) ; la copie miroir est retournée (x → −x) pour que le tissu se lise comme sur la pièce dessinée.
- `gltf.ts` : `buildGlb(success): Uint8Array`, GLB 2.0 petit-boutiste. Un nœud et un maillage par exemplaire
  (`pieceName` : `<panelId>` ou `<panelId>@<côté>`), chacun d'une primitive : `POSITION` (avec min et max), `NORMAL`,
  `TEXCOORD_0`, `_EASE_MM`, `_STRAIN`, indices `UNSIGNED_INT`. Blocs JSON (remplis d'espaces) et BIN (zéros) alignés sur
  4 octets ; `asset.generator` = `atelier-drape <ENGINE_VERSION>` ; aucun horodatage : mêmes entrées, mêmes octets.
- `cache-key.ts` : `canonicalJson` (clés triées), `sha256Hex`, `cacheKeyOf(job)` = SHA-256 du JSON canonique de
  `{ spec, measurements, avatar, fabric résolu, quality, engineVersion }` (les identifiants du travail n'y entrent pas),
  `modelKeyOf(organizationId, cacheKey)` = `drapes/<organizationId>/<cacheKey>.glb`.
- `events.ts` : `completedEvent(job, success, glb, cacheKey)` (clé, taille et SHA-256 du GLB plus `DrapeResultCore`) et
  `failedEvent(job, problem)`. `FAILURE_TYPES` donne le type du contrat de chaque problème ; `invalid-input` est publié
  comme `/problems/drape-internal` (designs valide la demande en amont). `retryable` est toujours faux : le calcul est
  déterministe. Aucune mesure dans les données.

Tests : `gltf.test.ts` (structure du GLB, accesseurs, min/max, déterminisme, une primitive par exemplaire),
`output-events.test.ts` (clé de cache, événements validés par le schéma généré via `schema-check.ts`, validateur minimal
car Ajv n'est pas une dépendance du moteur).
