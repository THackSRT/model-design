--8<-- "contracts/README.md"

## Mesures : correspondance avec FreeSewing

Le moteur de tracé `drafting` (ADR 0019) convertit un `MeasurementSet` en mesures FreeSewing dans son adaptateur, et
nulle part ailleurs. Longueurs en mm des deux côtés, pente d'épaule en degrés. Une mesure absente est estimée (moteur
ou mannequin) ; une mesure fournie prime toujours. Les mesures marquées « 1.54a » sont les onze ajoutées pour
FreeSewing, toutes facultatives ; leur colonne « Mesure » est leur libellé dans l'interface.

| `MeasurementSet`            | FreeSewing           | Mesure                                            | Remarque                                                                   |
| --------------------------- | -------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `sex`                       | —                    | Morphologie                                       | choisit le tableau de tailles et la source de `chest`                      |
| `statureMm`                 | —                    | Stature                                           |                                                                            |
| `neckGirthMm`               | `neck`               | Tour de cou                                       |                                                                            |
| `chestGirthMm`              | `chest` (homme)      | Tour de poitrine                                  | femme : `chest` vient de `bustGirthMm` s'il est fourni                     |
| `bustGirthMm`               | `chest` (femme)      | Tour de buste, sur les pointes de seins           |                                                                            |
| `highBustGirthMm`           | `highBust`           | Tour de poitrine haute                            | 1.54a ; sous les bras, au-dessus de la poitrine                            |
| `underBustGirthMm`          | `underbust`          | Tour de dessous de poitrine                       |                                                                            |
| `waistGirthMm`              | `waist`              | Tour de taille                                    |                                                                            |
| `upperHipGirthMm`           | `hips`               | Tour de hanches hautes                            | 1.54a ; au sommet des crêtes iliaques ; ce n'est pas le tour de bassin     |
| `hipGirthMm`                | `seat`               | Tour de bassin, le plus fort                      |                                                                            |
| `waistGirthBackMm`          | `waistBack`          | Part dos du tour de taille                        | 1.54a ; d'un côté à l'autre par le dos ; `waistBackArc` en est la moitié   |
| `hipGirthBackMm`            | `seatBack`           | Part dos du tour de bassin                        | 1.54a ; d'un côté à l'autre par le dos ; `seatBackArc` en est la moitié    |
| `upperArmGirthMm`           | `biceps`             | Tour de bras                                      |                                                                            |
| `wristGirthMm`              | `wrist`              | Tour de poignet                                   |                                                                            |
| `thighGirthMm`              | `upperLeg`           | Tour de cuisse                                    |                                                                            |
| `kneeGirthMm`               | `knee`               | Tour de genou                                     |                                                                            |
| `calfGirthMm`               | —                    | Tour de mollet                                    |                                                                            |
| `ankleGirthMm`              | `ankle`              | Tour de cheville                                  |                                                                            |
| `crotchHeightMm`            | `inseam`             | Hauteur d'entrejambe                              | équivalent proche (FreeSewing mesure le long de la jambe)                  |
| `cervicaleHeightMm`         | —                    | Hauteur de la cervicale                           |                                                                            |
| `waistHeightMm`             | `waistToFloor`       | Hauteur de taille                                 |                                                                            |
| `hipHeightMm`               | —                    | Hauteur du tour de bassin                         | `waistToSeat` = `waistHeightMm` − `hipHeightMm`                            |
| `kneeHeightMm`              | —                    | Hauteur du genou                                  | 1.54a ; depuis le sol ; `waistToKnee` = `waistHeightMm` − `kneeHeightMm`   |
| `backWaistLengthMm`         | `hpsToWaistBack`     | Longueur taille dos                               | départ à la cervicale ici, au point d'encolure dans FreeSewing : convertir |
| `frontWaistLengthMm`        | `hpsToWaistFront`    | Longueur taille devant                            |                                                                            |
| `neckShoulderToBustPointMm` | `hpsToBust`          | Du point d'encolure à la pointe de sein           |                                                                            |
| `bustPointWidthMm`          | `bustSpan`           | Écart des pointes de seins                        |                                                                            |
| `shoulderWidthMm`           | `shoulderToShoulder` | Carrure, d'un point d'épaule à l'autre par le dos |                                                                            |
| `shoulderSlopeDeg`          | `shoulderSlope`      | Pente d'épaule                                    | 1.54a ; en degrés entiers sous l'horizontale                               |
| `armscyeDepthMm`            | —                    | Profondeur d'emmanchure                           |                                                                            |
| `armLengthMm`               | `shoulderToWrist`    | Longueur de bras                                  |                                                                            |
| `waistToArmpitMm`           | `waistToArmpit`      | Hauteur taille-aisselle                           | 1.54a ; jusqu'au creux de l'aisselle, verticalement, sur le côté           |
| `waistToUpperHipMm`         | `waistToHips`        | Hauteur taille-hanches hautes                     | 1.54a ; verticalement, sur le côté                                         |
| `waistToThighMm`            | `waistToUpperLeg`    | Hauteur taille-cuisse                             | 1.54a ; jusqu'au niveau du tour de cuisse, verticalement                   |
| `crotchLengthMm`            | `crossSeam`          | Longueur de fourche                               | 1.54a ; montant total, de la taille devant à la taille dos                 |
| `frontCrotchLengthMm`       | `crossSeamFront`     | Longueur de fourche devant                        | 1.54a ; jusqu'au point de fourche ; `crossSeamBack` = la différence        |

Chaque mesure FreeSewing du catalogue 1 (Brian, Teagan, Titan, Sandy, Bella) a une source dans `MeasurementSet` :
`waistToSeat` et `waistToKnee` se déduisent des hauteurs, comme indiqué.

## Patron : GarmentSpec 1.1

La version 1.1 (ADR 0020) élargit GarmentSpec sans rien casser : tous ses champs sont facultatifs et une
spécification 1.0 reste valide. Un producteur écrit `specVersion: "1.1"` dès qu'il remplit un de ces champs.
Exemple complet et cohérent (contours fermés, embu de tête de manche, crans) :
`contracts/examples/garment-specs/tunic.json`.

**Deux rôles par bord.** `role` (structurel) dit comment le bord se coupe et se finit : couture, pliure de coupe,
ourlet, taille, bord libre ; il règle les valeurs de couture. `semanticRole` dit où il est sur le vêtement ; les
opérations du document de modèle ne lisent que lui et des repères. Un bord coupé en sous-bords pour apparier une
couture garde son rôle sémantique sur chacun.

| `semanticRole` | Bord                                                       |
| -------------- | ---------------------------------------------------------- |
| `neckline`     | Encolure                                                   |
| `shoulder`     | Épaule                                                     |
| `armhole`      | Emmanchure                                                 |
| `side`         | Côté du corps ou de la jupe                                |
| `hem`          | Bas du vêtement : corps, jupe ou jambe                     |
| `centerFront`  | Milieu devant (pli, couture ou ouverture)                  |
| `centerBack`   | Milieu dos                                                 |
| `sleeveCap`    | Tête de manche                                             |
| `underarm`     | Dessous de bras (couture de la manche)                     |
| `sleeveHem`    | Bas de manche (ourlet ou montage du poignet)               |
| `waist`        | Taille                                                     |
| `inseam`       | Entrejambe                                                 |
| `outseam`      | Côté extérieur de jambe                                    |
| `rise`         | Montant (couture de fourche, de la taille à l'entrejambe)  |
| `dart`         | Jambe de pince                                             |
| `styleLine`    | Découpe : plastron, empiècement, bande rapportée, couleurs |

**Matières.** `materials` est la table du vêtement (clé → `{ name }`), reprise du document de modèle ;
`Panel.material` et `LineMark.material` y renvoient par clé (`MaterialKey` : minuscule, puis lettres, chiffres et
tirets). Une pièce sans matière est dans une matière non précisée, commune à toutes ces pièces. `Panel.interfaced`
marque une pièce qui se coupe aussi dans l'entoilage, même forme et même nombre.

**Marques de pose** (`Panel.marks`), dans le repère de la pièce dessinée (mm, y vers le haut, côté endroit) :

| `kind`    | Marque                                                  | `points`       | Champs propres        | Essai des tuniques                |
| --------- | ------------------------------------------------------- | -------------- | --------------------- | --------------------------------- |
| `line`    | Ligne ouverte, ex. axe d'un galon                       | 2 à 1 000      | `material`, `widthMm` | galons                            |
| `outline` | Contour fermé, ex. emplacement d'une poche              | 3 à 1 000      | —                     | poche plaquée                     |
| `button`  | Bouton                                                  | 1 (son centre) | `diameterMm`          | boutons de patte                  |
| `slit`    | Fente à couper                                          | 2 (début, fin) | —                     | fentes d'encolure, patte, poignet |
| `zone`    | Zone fermée à orner, ex. broderie le long de l'encolure | 3 à 1 000      | —                     | zone de broderie                  |
| `fold`    | Ligne de pli intérieure                                 | 2 (extrémités) | —                     | plis de poignet, poche, patte     |

Toute marque peut porter `label` (texte d'une ligne, 80 caractères au plus, jamais de donnée de client) et `copy`.
Sans `copy`, la marque est sur tous les exemplaires de la pièce ; `drawn` la limite à la pièce telle que dessinée (la
moitié dessinée d'une pièce au pli), `mirrored` à sa copie retournée (l'autre moitié, ou le second exemplaire d'une
pièce en double). Une pièce au pli dont une marque n'est que sur un exemplaire se coupe dépliée. L'arrêt de fente de
l'essai n'est pas une marque : c'est un cran sur le bord de côté.

**Crans.** Un cran se place le long de son bord, à `distanceMm` de son début. Sur un bord cousu avec embu
(`Seam.easeMm`, tête de manche), la distance est mesurée le long de ce bord, embu compris : le cran qui lui répond
sur l'autre bord n'est pas à la même distance.

**Textes et exports.** Les noms de matières et les étiquettes sont écrits dans les exports (SVG, PDF, DXF) : le
schéma refuse les caractères de contrôle et borne leur longueur, et chaque export échappe encore le texte, comme
`engines/manufacturing`.

## Document de modèle 1.0

Un modèle est un document (ADR 0020) : `DesignDocument` (`contracts/schemas/designs/design-document.schema.json`) et
l'union de ses opérations, `DesignOperation` (`design-operation.schema.json`). Le moteur de tracé `drafting` le rejoue
(1.57), à l'identique dans le navigateur et sous Node ; `designs` l'enregistre (1.60b). Documents de référence :
`contracts/examples/design-documents/`, la tunique neutre (Brian, toile écrue, aucune opération) et les cinq tuniques de
l'essai, converties de `docs/suivi/essais/tuniques/garments.mjs` (taille homme 42 de FreeSewing).

| Champ             | Contenu                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documentVersion` | `"1.0"` ; une opération, une base, un repère, un paramètre ou une valeur de plus : version mineure                                                                                          |
| `base`            | `key` (catalogue 1 : `brian`, `teagan`, `titan`, `sandy`, `bella`, `straight-skirt`), `freesewingVersion` (`4.10.2`), `options` de FreeSewing en fractions : longueur et aisances générales |
| `measurements`    | `{ "size": "cisMaleAdult42" }` (tableau de FreeSewing, adultes) ou `{ "measurementSet": … }`, complet                                                                                       |
| `materials`       | clé (`MaterialKey`) → `{ name, kind, colors }` ; `main`, obligatoire, est la matière de la base                                                                                             |
| `operations`      | liste ordonnée, 64 au plus ; chaque opération : `id`, `op`, `enabled` (absent : vrai ; faux : masquée)                                                                                      |

**Opérations.** Longueurs en mm ; entre parenthèses, la valeur par défaut, qui fait partie du contrat et ne change
pas. Le rejeu applique les opérations actives par phase, puis dans l'ordre du document : deux opérations de phases
différentes donnent le même résultat dans les deux ordres, deux découpes se rejouent dans le leur.

| Phase | `op`           | Opération              | Paramètres                                                                                                 |
| ----- | -------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0     | `hemShape`     | Déformation d'ourlet   | `flareMm` (0), `curveMm` (0)                                                                               |
| 1     | `neckline`     | Encolure ronde ou en V | `shape` (`round`), `lowerMm` (0), `widenMm` (0), `vDepthMm` (160), `backLowerMm` (0), `facingWidthMm` (55) |
| 2     | `sleeveLength` | Longueur de manche     | `lengthMm`, du sommet de la tête de manche                                                                 |
| 3     | `cuff`         | Poignet                | `heightMm` (60), `style` (`barrel`, ou `french`), `easeMm` (60), `overlapMm` (20), `material`              |
| 4     | `sideSlit`     | Fentes de côté         | `heightMm` (100)                                                                                           |
| 4     | `band`         | Bande rapportée        | `edge` (`hem`, `sleeveHem`), `heightMm`, `material`, `name`                                                |
| 5     | `styleLine`    | Découpe                | `piece` (`front`), `line` (préréglage ou chemin), `extendMm` (15), `region`, `topstitch` (vrai)            |
| 6     | `neckSlit`     | Fente d'encolure       | `lengthMm` (80), `facingWidthMm` (70)                                                                      |
| 6     | `placket`      | Patte de boutonnage    | `lengthMm`, `widthMm` (30), `buttonCount` (3), `buttonDiameterMm` (13), `material`                         |
| 7     | `pocket`       | Poche plaquée          | `side` (`left`), `position`, `widthMm` (120), `heightMm` (135), `shape` (`straight`), `material`           |
| 8     | `trim`         | Galon                  | `side` (`both`), `path`, `widthMm` (40), `material`, `name` (absent : nom de la matière)                   |
| 9     | `embroidery`   | Broderie               | `widthMm` (32), `motif` (`leaves`), `withPlacket` (vrai), `material`                                       |

Un `material` absent vaut `main`. La découpe garde une région (`region` : `name`, `material`, `insidePoint` ; sans
point, la plus petite des deux parties par l'aire), l'autre partie garde son nom et sa matière ; sur une pièce au pli,
elle est symétrique. La poche se pose par défaut à
`{ "landmark": "armholeBottom", "xFraction": 0.55, "dyMm": -40 }`. Le motif d'un galon est le genre (`kind`) de sa
matière.

**Repère d'une pièce.** Les points du document sont dans le repère du tracé, en mm, **y vers le bas** (à l'inverse
de GarmentSpec) : x = 0 sur l'axe de la pièce que fixe sa fiche de couture (milieu devant ou dos, axe de la manche),
positif vers le côté, ou vers le devant sur une manche ; y = 0 au point le plus haut de la pièce de base, avant toute
opération (pour Brian, le niveau du point d'encolure). Un chemin (`Path` : 2 à 32 points, `smooth` pour une courbe de
Catmull-Rom qui passe par les points) se donne sur la moitié d'abscisses positives ; `side` choisit le côté du porteur.

| Point ancré        | Champs                                  | Exemple                                                           |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------- |
| Bord et abscisse   | `edge`, `xMm`                           | `{ "edge": "shoulder", "xMm": 196 }`                              |
| Bord et ordonnée   | `edge`, `yMm`                           | `{ "edge": "armhole", "yMm": 172 }`                               |
| Bord et fraction   | `edge`, `fraction` (0 à 1)              | `{ "edge": "hem", "fraction": 0.5 }`                              |
| Repère et décalage | `landmark`, `xFraction`, `dxMm`, `dyMm` | `{ "landmark": "armholeBottom", "xFraction": 0.47, "dyMm": -95 }` |
| Coordonnées        | `xMm`, `yMm`                            | `{ "xMm": 60, "yMm": 150 }`                                       |

Un bord se désigne par son rôle sémantique (`EdgeSemanticRole`) ; une manche a deux dessous de bras, celui du devant
est pris. Une abscisse ou une ordonnée hors de la plage du bord est ramenée à son extrémité ; si le bord l'atteint
plusieurs fois, le premier point dans le sens du bord est pris. Sens des bords, de 0 à 1 : du milieu vers le côté
(`neckline`, `shoulder`, `hem`, `waist`) ; de haut en bas (`armhole`, `side`, `centerFront`, `centerBack`, `underarm`,
`inseam`, `outseam`, `rise`, `dart`) ; du dos vers le devant (`sleeveCap`, `sleeveHem`) ; dans le sens du chemin qui
l'a tracé (`styleLine`). Repère (`landmark`) : abscisse = `xFraction` × abscisse du repère + `dxMm`, ordonnée =
ordonnée du repère + `dyMm` ; sa position est celle du moment du rejeu (l'encolure déplace `centerNeck` et
`neckShoulder`). Repères : `centerNeck`, `neckShoulder`, `shoulderPoint`, `armholePitch`, `armholeBottom`,
`centerWaist`, `sideWaist`, `centerHip`, `sideHip`, `centerHem`, `sideHem` ; sur la manche, `sleeveTop`,
`bicepsFront`, `bicepsBack`, `wristFront`, `wristBack`.

**Découpes prédéfinies** (D = `depthMm`, profondeur sous le haut de la pièce ; W = `shoulderXMm`, départ sur
l'épaule) : `u`, de l'épaule à x = W par (W − 2 ; 0,465 D), (W − 18 ; 0,82 D) et (0,56 W ; 0,97 D) jusqu'à (0 ; D),
lissée ; `pointed`, de l'épaule à x = W par (W − 6 ; 0,36 D) jusqu'à (0 ; D) ; `square`, de l'épaule à x = W par
(W ; 0,86 D) et (W − 14 ; D) jusqu'à (0 ; D) ; `yoke`, de (0 ; D) à (420 ; D). Un préréglage est prolongé de 15 mm.
`u` (W = 196, D = 258) et `pointed` (W = 186, D = 292) redonnent à moins d'un millimètre les plastrons des tuniques 2
et 3 ; les documents de référence gardent les chemins libres de l'essai, qui prouvent que le chemin libre suffit.

**Règles vérifiées par le rejeu**, qu'un schéma JSON ne sait pas dire (`drafting`, 1.57b ; erreur typée, sans valeur
de mesure ni texte du document) :

- chaque `id` est unique dans la liste (le schéma ne refuse que deux opérations identiques) ;
- toute clé de matière citée (`material`, `region.material`) figure dans `materials` ;
- la base est au catalogue du moteur, `freesewingVersion` est celle qu'il embarque, chaque option existe pour la base,
  avec son type et dans ses bornes ;
- un `measurementSet` porte toutes les mesures de la base : rien n'est déduit (ADR 0024), le mannequin les complète
  dans le studio avant l'enregistrement ; une taille du tableau les a toutes ;
- une seule opération active de chaque sorte pour `hemShape`, `neckline`, `sleeveLength`, `cuff`, `sideSlit`,
  `neckSlit`, `placket` et `embroidery` ; une bande active par bord ; un bas de manche a un poignet ou une bande ;
- une pièce, un bord ou un repère que la base n'a pas, ou une découpe qui ne traverse aucune région, rend l'opération
  inapplicable.

**Sécurité et données.** Le document est une entrée non sûre, rejouée par `designs` sous Node (ADR 0024) : le schéma
borne 64 opérations, 32 points par chemin, 20 matières de 4 couleurs, 64 options, des textes d'une ligne de 80
caractères sans caractère de contrôle et des coordonnées de ±3 000 mm ; un document réel tient en quelques Ko, le plus
grand permis en une centaine. Les noms (matières, régions, bandes, galons) vont dans les patrons et les exports, qui
les échappent comme ceux de GarmentSpec. Un document qui porte un `measurementSet` contient une donnée personnelle :
jamais journalisé ni recopié dans une erreur, envoyé à l'assistant seulement avec un consentement (ADR 0023) ; un
document à partager ou à donner en exemple part d'une taille.

**Messages et types.** `DesignOperation` porte le mot-clé `discriminator` (OpenAPI 3.1) sur `op`, et le valideur des
services (`contractValidator` de `service-kit`) active l'option `discriminator` d'Ajv : un document refusé ne donne
qu'un message par faute (« /operations/0/lowerMm must be <= 250 », « /operations/0 value of tag "op" must be in oneOf »)
au lieu de ceux des douze branches ; le Python généré en fait une union discriminée. Les deux schémas citant
GarmentSpec et MeasurementSet, le générateur n'exporte que leurs types racines : une opération se nomme
`Extract<DesignOperation, { op: 'neckline' }>`.

**Depuis l'essai.** `decoupe` devient `styleLine` (`inside` et `insideRef` : `region`, `outsideName` disparaît),
`slit` devient `sideSlit` ; `totalMm`, `buttons`, `buttonMm` et `facingMm` deviennent `lengthMm`, `buttonCount`,
`buttonDiameterMm` et `facingWidthMm` ; `x`, `y`, `dx`, `dy` prennent le suffixe `Mm` ; la poche se pose par
`position` (`xPct`, `ref: "armhole"`, `dy` : `xFraction`, `armholeBottom`, `dyMm`) et sa forme `point` devient
`pointed` ; le `motif` du galon passe au genre de sa matière ; le `tone` d'une matière devient `kind` (`main` : `plain`,
`stripes` : `stripedTrim`, `geo` : `geometric`, `light` : `weave`, `greek` : `greekKeyTrim`) et sa couleur, `colors` ;
la broderie cite sa matière de fil, que l'essai lisait sous la clé `brod`.
