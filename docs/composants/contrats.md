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
