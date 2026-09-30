# 0010 — GarmentCode : repris comme modèle, réécrit en Python pur dans le cœur du moteur de patronage

**Contexte.** Le travail 1.11 doit apporter au moteur `engines/patterning` les composants corsage, jupes, manches
et pantalons de GarmentCode (architecture 5.2), avec des références golden validées sur toile par un modéliste.
Le plan de la phase 1 prévoyait « un adaptateur dans `spec/` (centimètres ↔ mm) ». L'étude de GarmentCode
(septembre 2026 : paquet PyPI `pygarment` 2.0.2 et dépôt `maria-korosteleva/GarmentCode`, commit `d449629`)
constate :

- **Licence** : MIT (`LICENSE`, « Copyright (c) 2024 Maria Korosteleva »), pour la bibliothèque et les programmes
  de vêtements (`assets/garment_programs/`). Les corps `assets/bodies/*smpl*` dérivent de SMPL (CC BY 4.0 et
  licence SMPL) : on n'en reprend rien.
- **Paquet PyPI inutilisable** : la roue 2.0.2 installe des paquets de premier niveau `garmentcode`, `pattern`,
  `meshgen`, `mayaqltools` mais pas `pygarment`, que son propre code importe (`import pygarment` échoue) ; les
  programmes de vêtements n'y sont pas. Dépendances déclarées : `cgal` (**GPL-3.0+**), `CairoSVG`
  (**LGPL-3.0+**), `libigl` (MPL-2.0), `matplotlib` (licence propre), `nicegui`, `pyrender`, `trimesh`, `psutil`,
  `numpy<2`, `scipy`, `svgpathtools`, `svgwrite`, `pyyaml`. Le simulateur (NVIDIA Warp modifié) est à part.
- **Noyau réellement utile** : environ 7 600 lignes Python non typées (`pygarment/garmentcode`,
  `pygarment/pattern/core.py`, dix programmes), qui demandent encore numpy, scipy et svgpathtools. Or l'ADR 0009
  écarte numpy des moteurs (ses roues embarquent libquadmath, LGPL-2.1, et le support d'exécution GCC) ; scipy
  embarque en plus libgfortran et OpenBLAS.
- **numpy 2** : `np.cross` sur des vecteurs 2D lève une erreur (8 appels) ; avec numpy 1.26 le code tourne.
- **Unités et format** : centimètres et degrés ; sortie JSON (`panels` : sommets 2D, bords par indices, courbes
  `quadratic`/`cubic` en coordonnées relatives au bord, arcs `circle` au format SVG, placement 3D ; `stitches` :
  paires de bords, pinces cousues sur la même pièce). Pas de droit fil, pas de rôle de bord, **pas de crans**.
- **Déterminisme** : pas de hasard dans l'assemblage (seulement dans l'échantillonnage de paramètres). La
  géométrie est identique d'une exécution à l'autre, mais l'ordre des pièces varie (`set` d'objets dans
  `component.py`). L'ajustement de la manche (`curve_match_tangents` : L-BFGS-B, gradient par différences finies,
  objectif non lisse) est instable : un calcul équivalent au dernier bit près déplace des sommets de 0,47 mm
  (0,22 mm avec des tolérances serrées). La reproductibilité octet pour octet d'une plateforme à l'autre n'est
  donc pas garantie.
- **Temps** : jupes et pantalons de 5 à 220 ms ; corsage avec manches de 3,6 à 4,8 s (80 % dans l'échantillonnage
  de courbure de svgpathtools), au-delà de la cible (< 1 s) et du délai de `designs` (`PATTERNING_TIMEOUT_MS`,
  2 000 ms).
- **Coutures non égalisées** : GarmentCode vise la simulation, qui absorbe les écarts. Pour le corps moyen féminin :
  côtés de la jupe crayon 227,7 / 239,1 mm, entrejambe du pantalon 227,7 / 250,5 mm, épaule et côté du corsage
  jusqu'à 3,7 mm, tête de manche 217,8 mm pour 197,5 mm d'emmanchure, ceinture de jupe cercle 425,7 mm pour
  315,0 mm de taille. Une toile cousue à plat ne tomberait pas juste.
- **Sécurité** : les programmes choisissent des classes par leur nom venu des paramètres (`globals()[…]`,
  `getattr(…)`) ; une forme de découpe lit un fichier SVG dont le chemin vient des paramètres ; des `print`
  écrivent des valeurs calculées sur les mesures (données personnelles) dans la sortie standard.

**Décision.**

- **Ni dépendance, ni code vendu : une réécriture ciblée.** GarmentCode est la _référence de conception_ du
  moteur, pas une bibliothèque exécutée. Ses constructions (pièces, interfaces, règles de couture, pinces,
  niveaux taille-hanches, prolongement d'entrejambe, arc de jupe cercle) sont réécrites en Python pur, typé, en
  millimètres, dans `patterning/core/`, sans numpy ni scipy, sans aucune dépendance nouvelle. Écartés :
  - dépendance PyPI : paquet cassé, dépendances GPL-3.0 et LGPL-3.0 ;
  - code vendu (7 600 lignes) : il tire numpy et scipy (contraire à l'ADR 0009), il faut le corriger pour numpy 2,
    le rendre déterministe et rapide, puis égaliser ses coutures ; on garderait du code tiers non typé hors des
    règles de lint, dont la sortie changerait à chaque correction demandée par le modéliste.
- **Fidélité et attribution.** Chaque module réécrit cite dans sa docstring le fichier GarmentCode d'origine et le
  commit `d449629`. `engines/patterning/THIRD_PARTY_NOTICES.md` reproduit la licence MIT de GarmentCode, et le
  Dockerfile la copie dans l'image. Les noms des paramètres de style de GarmentCode (`suns`, `rise`, `flare`…)
  sont notés en regard des nôtres, pour qu'une proposition du futur moteur IA au format GarmentCode
  (Design2GarmentCode, ChatGarment) se traduise sans perte.
- **Constructions déterministes.** Aucune optimisation numérique à arrêt par tolérance. Une quadratique tangente
  à deux directions se construit par intersection des tangentes ; un arc devient des cubiques de 90° au plus
  (k = 4/3·tan(θ/4)) ; un ajustement de longueur (tête de manche sur l'emmanchure plus l'embu) passe par une
  dichotomie à nombre d'itérations fixe. Arrondi à 0,01 mm en sortie (inchangé). Pas d'ordre venant d'un `set`.
- **Coutures justes par construction.** Deux bords cousus ont la même longueur à 0,5 mm près, sauf si la couture
  déclare un embu (`easeMm`, ex. tête de manche de 10 à 30 mm), qui est alors respecté à 0,5 mm près.
- **Couches inchangées** : `core/` (calcul pur, mm), `spec/` (contrat ↔ cœur, seul endroit qui connaît le
  contrat), `api/`. Aucun code n'est en centimètres, donc pas d'adaptateur centimètres ↔ mm. Organisation du
  cœur : `core/body.py` (mesures complétées), `core/curves.py` (constructions), `core/checks.py` (contours
  fermés, sens trigonométrique, coutures), `core/garments/` (un module par vêtement, moins de 300 lignes
  chacun), `core/drafting.py` (type de vêtement → fonction de tracé).
- **Mesures.** Correspondance du contrat vers les mesures de GarmentCode (le cœur garde nos noms, en mm) :

  | GarmentCode (cm)                          | Contrat (`MeasurementSet`, mm)                                   |
  | ----------------------------------------- | ---------------------------------------------------------------- |
  | `height`                                  | `statureMm`                                                      |
  | `bust`                                    | `bustGirthMm`, sinon `chestGirthMm`                              |
  | `underbust`                               | `underBustGirthMm`                                               |
  | `waist`, `hips`, `leg_circ`, `wrist`      | `waistGirthMm`, `hipGirthMm`, `thighGirthMm`, `wristGirthMm`     |
  | `head_l`                                  | `statureMm − cervicaleHeightMm`                                  |
  | `waist_line`                              | `backWaistLengthMm`                                              |
  | `hips_line`                               | `waistHeightMm − hipHeightMm`                                    |
  | `crotch_hip_diff`                         | `hipHeightMm − crotchHeightMm`                                   |
  | `shoulder_w`, `bust_points`, `arm_length` | `shoulderWidthMm`, `bustPointWidthMm`, `armLengthMm`             |
  | `bust_line`, `waist_over_bust_line`       | `neckShoulderToBustPointMm`, `frontWaistLengthMm`                |
  | `armscye_depth`                           | `armscyeDepthMm`                                                 |
  | `waist_back_width`, `back_width`          | estimées : 0,47 / 0,46 × tour de taille ; 0,47 / 0,49 × poitrine |
  | `hip_back_width`, `bum_points`            | estimées : 0,535 / 0,524 × tour de hanches ; 0,17 × hanches      |
  | `neck_w`, `shoulder_incl`                 | estimées : 0,107 / 0,114 × stature ; 21° / 22,5°                 |
  | `hip_inclination`                         | estimée : 12,7° / 6,7°                                           |

  Une mesure facultative absente est estimée par un rapport à la stature ou à un tour, tiré des corps moyens
  `mean_female` / `mean_male` de GarmentCode (valeur femme / homme) : tête 0,154 / 0,152 × stature, longueur
  taille dos 0,215 / 0,214, profondeur taille-hanches 0,136 / 0,137, carrure 0,209 / 0,215, longueur de bras
  0,31 / 0,318, profondeur d'emmanchure 0,076 / 0,073, point d'épaule-poitrine 0,154 / 0,145 ; écart des
  pointes de seins 0,166 / 0,173 × poitrine, dessous de poitrine 0,829 / 0,905 × poitrine. Les rapports sont
  des constantes nommées de `core/body.py` et une hypothèse à valider par le modéliste. Toute mesure estimée
  est listée dans la sortie (`estimatedMeasurements`). Une estimation incohérente (hanches sous l'entrejambe,
  par exemple) donne une `DraftingError` (422), jamais un patron faux.

- **Sortie** : `GarmentSpec` 1.0, étendue par des champs facultatifs (plus bas). Les pièces sont vues côté
  endroit du tissu, contour dans le sens trigonométrique. Les pièces gauche et droite sont distinctes quand le
  vêtement n'est pas symétrique ; une pièce symétrique est tracée entière ou au pli (`cutOnFold`), au choix du
  tracé, sans jamais les deux. Droit fil : vertical, au milieu de la pièce, sauf indication du tracé. Les
  identifiants de pièce et de bord sont stables, en kebab-case (`front`, `back-left`, `side`, `dart-1-left`). Le
  placement 3D autour du corps n'entre pas dans cette version : il viendra avec le drapé (1.19), par une
  extension du contrat.
- **Crans** : GarmentCode n'en produit aucun. Le moteur de patronage pose les crans qu'il est seul à connaître :
  tête de manche (un cran devant, deux au dos, un au sommet) et emmanchure correspondante, ligne des hanches
  sur les côtés, milieu devant et milieu dos à la taille. Ils sortent dans `Panel.notches` (même forme que
  `NotchRequest` de l'ADR 0009, sans `panelId`). Le moteur de fabrication les réunit à ses crans demandés et
  automatiques, en supprimant les doublons.
- **Jupe droite provisoire** : le type `straight-skirt` et ses paramètres restent. Son tracé est remplacé par la
  jupe droite à pinces réécrite de `PencilSkirt` (devant au pli, dos en deux pièces), et `core/straight_skirt.py`
  disparaît dans la même demande de fusion. Sa référence golden n'a jamais été validée par un modéliste : la
  remplacer relève d'une instruction explicite de l'orchestrateur dans cette tâche.
- **Références golden** : une par type de vêtement, sur des mesures synthétiques (jamais un vrai client). Chaque
  fichier est déclaré dans `tests/golden/references.json` (`file`, `garmentType`, `engineVersion`, `status`
  `candidate` ou `validated`, `validatedOn`, `note` ; ni nom ni donnée de personne). Une référence naît
  `candidate` ; elle passe `validated` après la toile du modéliste (travail 1.25), par une demande de fusion qui
  ne touche qu'au manifeste. La comparaison reste stricte, au caractère près, dans l'environnement verrouillé
  (`uv.lock`, Python 3.12). Tout changement de tracé incrémente `ENGINE_VERSION` (0.2.0 à la première tâche de
  tracé, puis une version mineure par tâche).
- **Temps** : chaque tracé tient en moins de 100 ms ; un test de budget échoue au-delà de 1 s pour les
  références.

**Changements de contrat** (première tâche, 1.11a ; tous compatibles, pas de nouvelle version d'API) :

- `measurement-set.schema.json` : champs facultatifs, entiers en mm, termes ISO 8559-1 : `bustGirthMm`
  (600–1800), `underBustGirthMm` (500–1700), `cervicaleHeightMm` (700–2000), `waistHeightMm` (500–1400),
  `hipHeightMm` (400–1200), `backWaistLengthMm` (300–600), `frontWaistLengthMm` (300–700),
  `neckShoulderToBustPointMm` (150–450), `bustPointWidthMm` (100–300), `shoulderWidthMm` (250–550),
  `armscyeDepthMm` (100–300), `armLengthMm` (400–900).
- `garment-request.schema.json` : la racine devient un `oneOf` de requêtes discriminées par `type` (`const`).
  Les charges utiles existantes restent valides et `$defs.StraightSkirtParams` garde son nom (le studio en lit
  les bornes).
  - `StraightSkirtRequest` : `straight-skirt`, paramètres inchangés.
  - `CircleSkirtRequest` : `circle-skirt`. `lengthMm` (requis, 300–1300, de la taille à l'ourlet), `waistEaseMm`
    (0–80, défaut 10), `circleFraction` (0,25–1, défaut 1 ; `suns` de GarmentCode), `waistbandWidthMm` (0 ou
    20–80, défaut 0 : sans ceinture).
  - `TrousersRequest` : `trousers`. `lengthMm` (requis, 300–1300, de la taille à l'ourlet sur le côté),
    `waistEaseMm` (0–80, défaut 10), `hipEaseMm` (20–200, défaut 50), `hemGirthMm` (facultatif, 250–900 ;
    absent : jambe droite depuis le genou).
  - `BodiceRequest` : `bodice`. `lengthBelowWaistMm` (0–400, défaut 0), `bustEaseMm` (0–200, défaut 60),
    `waistEaseMm` (0–200, défaut 40), `frontNeckDepthMm` et `backNeckDepthMm` (0–250, défaut 0 : encolure
    naturelle), `sleeve` (facultatif, absent : sans manches) = `SleeveParams` : `lengthMm` (requis, 100–900,
    du point d'épaule à l'ourlet), `capEaseMm` (0–40, défaut 15), `hemGirthMm` (facultatif, 150–600).
- `garment-spec.schema.json` (`specVersion` reste `1.0`) : `estimatedMeasurements` facultatif (tableau de noms
  de champs de `MeasurementSet`) ; `Seam.easeMm` facultatif (0–50 : le bord `a` est plus long de cette valeur
  et s'embue sur `b` ; absent : 0) ; `Panel.notches` facultatif (`Notch` : `edgeId`, `distanceMm` le long du
  bord depuis `from`, `count` 1–3) ; description précisant « pièces vues côté endroit ». À aligner avec la
  proposition de l'ADR 0009 : une seule définition de `Notch`, dans `garment-spec.schema.json`.
- `designs/create-design-request.schema.json` et `designs/design.schema.json` : `garmentType` accepte les
  mêmes quatre valeurs (`straight-skirt`, `circle-skirt`, `trousers`, `bodice`) ; une énumération commune
  (`garment-type.schema.json`) évite de les tenir à trois endroits. Si la base de `designs` contraint la
  colonne du type, sa migration est une tâche de `designs`.

**Conséquences.**

- Aucune dépendance nouvelle ; le moteur reste en Python pur, rapide et reproductible. En échange, il faut
  réécrire environ 1 500 lignes, en quatre tâches de tracé, et la palette de styles de GarmentCode (cols,
  poignets, godets, volants, jupes à étages) n'arrive qu'au fil des besoins, composant par composant.
- Le plan de la phase 1 (point 1), `engines/patterning/AGENTS.md`, l'architecture 5.2 (« s'appuie sur la
  bibliothèque GarmentCode ») et `docs/directives/moteurs.md` (conversions en centimètres) sont à mettre à jour :
  GarmentCode y devient la référence de conception, réécrite.
- Le studio (formulaire), `designs` (validation Ajv des requêtes) et `engines/manufacturing` (crans, embu)
  consomment les nouveaux champs dans leurs propres travaux. Le studio doit accepter tout identifiant de pièce.
- Les rapports d'estimation, l'embu de manche et l'égalisation des coutures sont des choix de patronage :
  le modéliste les valide sur toile (1.25), et une correction de sa part est un changement de tracé, donc
  une nouvelle `ENGINE_VERSION`.
- Reprendre plus tard du code GarmentCode tel quel (ex. pour lire un patron au format GarmentCode venu de
  l'IA) demandera une nouvelle ADR ; lire ce format JSON ne demande d'ailleurs ni numpy ni scipy.

**Décisions de l'utilisateur (30/09/2026).** Réécriture des tracés en Python pur retenue (pas de dépendance ni de
code copié). Ordre de livraison : jupes (droite à pinces, cercle), puis pantalon, puis corsage avec ou sans
manches. La référence golden provisoire de la jupe droite, jamais validée, est remplacée. Aucun modéliste n'est
encore désigné : les références restent « candidates » jusqu'à la validation sur toile (porte 1.25).
