# Essai de FreeSewing 4.10.2 comme moteur de tracé 2D

**Essai du 3 octobre 2026**, mené hors du dépôt sur six modèles (Bella, Penelope, Sandy, Titan, Teagan, Tiberius),
dans Node 22.22 et Chromium 141 sans écran. Il fonde la recommandation de la
[proposition : studio temps réel](proposition-temps-reel.md). Les scripts, les fiches de couture d'essai, les mesures
brutes et la page de test interactive sont dans l'archive `essai-freesewing.tar.gz` remise avec la proposition ;
l'adaptateur, la conversion en GarmentSpec, les fiches et les mesures sont versés, figés, dans `docs/suivi/essais/freesewing/`.

## Verdict : oui, à conditions

FreeSewing peut tracer les patrons du studio dans le navigateur, derrière le contrat GarmentSpec, à condition de
contrôler chaque tracé : il ne donne que de la géométrie, la sémantique (bords, rôles, coutures, pinces) vient d'une
fiche de couture écrite par modèle.

- **Vitesse** : 0,5 à 6 ms par tracé à chaud dans Node, 0,46 à 4,64 ms dans Chromium ; cinq modèles sur six tiennent
  dans une image à 60 img/s même au p95. Penelope fait exception (18,6 ms dans Chromium, jusqu'à 55 ms au p95).
- **Poids** : 310 Ko brut et 87 Ko gzip pour le cœur, six modèles et les mesures ; cœur seul 177 Ko, 52 Ko gzip.
- **Adaptateur** : 100 % des sommets des contours (129 441 contrôlés) portent un nom de point FreeSewing à 0,01 mm près.
  Une fiche de 6 à 8 Ko par modèle reste valable sur 5 tailles et 1 780 à 2 050 combinaisons d'options : 0 rupture
  pour Teagan et Titan, 1 pour Bella (exception du moteur). La conversion en GarmentSpec passe le schéma du dépôt et
  les contrôles du moteur de référence sur 3 340 tracés.
- **Réserves** : écarts silencieux (épaule de Bella, tête de manche ajustée à ± 2 mm seulement, côté de Titan jusqu'à
  4 mm aux bornes), plan de coupe peu fiable, 12 des 29 mesures requises absentes de `MeasurementSet`, cinq imports
  non déclarés qui cassent une installation neuve, ni fichier LICENSE ni types TypeScript dans les paquets.

Par modèle : **Teagan** oui ; **Titan** oui ; **Bella** oui après trois garde-fous (embu d'épaule déclaré, contrôle de
la manche, plan de coupe tiré de la fiche) ; **Penelope** non en l'état ; **Sandy** et **Tiberius** : contours
exploitables, fiche à écrire.

## Vitesse

Tracé à chaud : construction du modèle puis `draft()`, mesures et une option qui varient, médiane de 200 tracés après
30 de chauffe, trois passages (ms).

| Modèle   | Mesures requises | Options réglables | Node (médiane) | Chromium (médiane) | Chromium p95 | Premier tracé Chromium |
| -------- | ---------------- | ----------------- | -------------- | ------------------ | ------------ | ---------------------- |
| Bella    | 16               | 46                | 4,35           | 3,64               | 6,58         | 29,5                   |
| Penelope | 5                | 16                | 26,47          | 18,58              | 38,95        | 91,7                   |
| Sandy    | 4                | 10                | 1,23           | 0,97               | 1,60         | 16,7                   |
| Titan    | 12               | 19                | 2,11           | 1,77               | 3,15         | 25,4                   |
| Teagan   | 13               | 39                | 6,10           | 4,64               | 8,34         | 34,8                   |
| Tiberius | 12               | 10                | 0,57           | 0,46               | 0,63         | 14,3                   |

Chromium est 16 à 30 % plus rapide que Node. Le rendu SVG coûte 0,2 à 1 ms. Le script complet se charge et
s'exécute en 32 ms. Penelope est lente à cause d'une boucle d'ajustement de la largeur de taille (40 à 52 passes par
pièce, 143 366 évaluations de Bézier par tracé à la taille 36) et d'un défaut d'ordre : le dos est tracé avant le
devant, si bien que la longueur de côté lue par le dos est indéfinie (44 avertissements par tracé) et que
l'ajustement de côté du dos ne s'exécute jamais.

## Fiche de couture et adaptateur

Chaque sommet du contour (`paths.seam`) porte un nom de point parlant : par exemple, au devant de Teagan, `hem` →
`armhole` (côté), `armhole` → `shoulder` (emmanchure), `shoulder` → `neck` (épaule), `neck` → `cfNeck` (encolure).
Une fiche décrit donc les bords par des plages de points, leur rôle, les pinces, la coupe et les paires de coutures,
sans code propre au modèle. L'adaptateur d'essai découpe le contour en segments, nomme les sommets, résout la fiche,
mesure les coutures, puis produit une GarmentSpec (bords en chaîne de courbes découpés aux fractions de longueur pour
respecter « une couture relie deux bords »).

| Modèle | Tracés validés | Fiche rompue | Erreur du moteur | Paire hors ± 2 mm de l'embu prévu |
| ------ | -------------- | ------------ | ---------------- | --------------------------------- |
| Teagan | 1 970          | 0            | 0                | 0                                 |
| Bella  | 2 050          | 1            | 1                | 1 867 (épaule 1 849, manche 85)   |
| Titan  | 1 780          | 0            | 0                | 9 (côté, 2,1 à 4,0 mm)            |

Écarts de couture au défaut, tailles 28 à 46 et homme 42 (mm, a moins b) :

| Paire                                           | Écarts                                                        |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Teagan côté, épaule, dessous de bras            | 0,00 partout                                                  |
| Teagan tête de manche contre emmanchures        | − 1,33 à + 1,62 (embu prévu 0)                                |
| Bella côté, dessous de bras, milieu dos, pinces | 0,00 partout                                                  |
| Bella épaule, dos moins devant                  | + 4,22 à + 4,85 sur 20 tailles (− 3,4 à + 13,1 selon options) |
| Bella tête de manche contre emmanchures         | − 1,85 à + 0,90                                               |
| Titan côté                                      | − 0,02 à + 0,18                                               |
| Titan entrejambe                                | − 0,09 à + 0,34                                               |

Les coutures que FreeSewing dimensionne l'une sur l'autre sont exactes ; la tête de manche n'est ajustée qu'à ± 2 mm
(arrêt de la boucle du modèle de bibliothèque) ; l'épaule de Bella porte un embu implicite d'environ 4,6 mm, pratique
courante en patronage mais non déclarée. Conséquence : **l'embu se déclare dans la fiche, il ne se suppose jamais**,
et chaque tracé est contrôlé (0,15 à 0,35 ms).

Le plan de coupe de FreeSewing (`store.cutlist`) se contredit par endroits (dos de Bella « × 2 au pli » alors que son
milieu dos est une couture, pli de Penelope non déclaré, pièces masquées comptées, aucune doublure) : il se déduit de
la fiche et de la géométrie. Le placement sur le corps et les crans ne sont pas fournis : la fiche les porte.

## Mesures

Les six modèles demandent 29 mesures FreeSewing : 17 existent dans `MeasurementSet`, 12 non (dont `hips`, qui est le
tour des hanches hautes et non le tour de bassin ISO ; celui-ci correspond à `seat`). Sur le mannequin 3D ajusté,
12 se mesurent avec l'outillage actuel, 15 demandent un repère anatomique à ajouter (point haut d'épaule, acromion,
pointe de sein, aisselle, crête iliaque) et 2 sont délicates (longueurs de fourche). Couverture actuelle : Bella 12
sur 16, Teagan 9 sur 13, Tiberius 8 sur 12, Titan 6 sur 12, Penelope 4 sur 5, Sandy 2 sur 4.

## Défauts trouvés

| Réf.        | Défaut                                                                                                                                | Parade                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| P1          | Cinq imports non déclarés (core-plugins, plugin-annotations, models, bella, teagan) : installation neuve en échec avec npm comme pnpm | `packageExtensions` de pnpm (essayé)          |
| P2          | Aucun fichier LICENSE dans les 22 paquets (MIT déclaré dans `package.json`)                                                           | Avis MIT livré avec le studio, ADR            |
| P4          | Sources ES brutes, aucun type TypeScript                                                                                              | Déclarations minimales de la surface utilisée |
| L1          | Penelope : ordre de tracé, boucle lente, écart de côté jusqu'à 6,2 mm                                                                 | Écartée ; jupe droite écrite par nous         |
| L2          | Bella : embu d'épaule implicite (4,2 à 4,9 mm)                                                                                        | Embu déclaré dans la fiche                    |
| L4          | Tête de manche ajustée à ± 2 mm ; 85 tracés de Bella au-delà, sans avertissement                                                      | Contrôle de chaque tracé                      |
| L5          | Bella : exception dans la manche de bibliothèque (1 tracé sur 2 050)                                                                  | Rejet de tout tracé avec erreur au journal    |
| L3, L6 à L8 | Plan de coupe et lignes de pli peu fiables                                                                                            | Coupe tirée de la fiche                       |
| L9          | Titan : le tracé en unités impériales change la géométrie (1,75 mm)                                                                   | Toujours tracer en métrique                   |
| D1          | Résultats identiques au bit près entre Node et Chromium pour 519 tracés sur 1 105 (écart au plus 1,2e-11 mm)                          | Arrondi à 0,001 mm                            |

## Conditions d'adoption

1. FreeSewing derrière GarmentSpec, version épinglée (4.10.2), tracé en métrique, arrondi à 0,001 mm.
2. Une fiche de couture par modèle, validée sur 5 tailles et aux bornes des options par le banc générique (moins de
   15 s par modèle) dans les vérifications.
3. Chaque tracé contrôlé : journal d'erreurs vide, bords résolus, contour couvert, paires dans la tolérance ; sinon
   rejet avec un message clair.
4. Embu déclaré, jamais supposé (tête de manche, épaule).
5. `packageExtensions`, avis MIT livré, ADR de dépendance, déclarations de types minimales.
6. `MeasurementSet` étendu (`hips`, `waistBack`, `seatBack`, `shoulderSlope`, `waistToArmpit`, `waistToHips`,
   `crossSeam`, `crossSeamFront`, `waistToUpperLeg`) et repères ajoutés au mannequin.
7. Premiers modèles : Teagan, Titan, Sandy, Tiberius, puis Bella avec ses garde-fous ; Penelope remplacée par notre
   jupe droite.

## Page de test interactive

La page `banc-freesewing.html` (archive de l'essai) trace les six modèles dans le navigateur, sur 20 tailles, avec
140 commandes générées automatiquement depuis les options des modèles, le temps de chaque tracé, les longueurs des
bords et, pour Teagan, Bella et Titan, le panneau des coutures avec leurs écarts. Rien n'y est envoyé sur le réseau.
