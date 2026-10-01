# Formats de données

Deux formats circulent partout : le **jeu de mesures** du client et la **spécification de patron**, format pivot
entre services, moteurs et applications. Les schémas ci-dessous sont les fichiers du dépôt, affichés tels quels.

## Jeu de mesures (`MeasurementSet`)

Mesures du corps selon l'ISO 8559-1, en millimètres entiers. Stature, poitrine, taille et bassin sont obligatoires.

```json
--8<-- "contracts/schemas/measurement-set.schema.json"
```

## Spécification de patron (`GarmentSpec`)

Un patron est un ensemble de pièces à plat (`panels`), chacune un contour fermé de bords (`edges`) droits ou en
courbe de Bézier, et de coutures (`seams`) qui relient deux bords. Coordonnées en millimètres, y vers le haut ;
chaque spécification porte le nom et la version du moteur qui l'a calculée.

```json
--8<-- "contracts/schemas/garment-spec.schema.json"
```

## Demande de patron (`GarmentRequest`)

Le type de vêtement et ses paramètres. Contrat : `contracts/schemas/garment-request.schema.json`.

Types disponibles :

- `straight-skirt` (jupe droite) : `lengthMm`, paramètres par défaut
- `circle-skirt` (jupe cercle) : `lengthMm`, `waistEaseMm`, `circleFraction`, `waistbandWidthMm` (optionnel)
- `trousers` (pantalon) : `lengthMm`, `waistEaseMm`, `hipEaseMm`, `hemGirthMm` (optionnel) ; mesure obligatoire :
  `crotchHeightMm` (hauteur d'entrejambe)
- `bodice` (corsage) : `lengthBelowWaistMm`, `bustEaseMm`, `waistEaseMm`, `frontNeckDepthMm`,
  `backNeckDepthMm`, `sleeve` (optionnel : `SleeveParams` avec `lengthMm`, `capEaseMm`, `hemGirthMm`) ;
  mesures obligatoires : `bustGirthMm` (tour de poitrine) et `backWaistLengthMm` (longueur taille dos)

Mesures étendues (ISO 8559-1, millimètres, facultatives) : `underBustGirthMm`, `cervicaleHeightMm`,
`waistHeightMm`, `hipHeightMm`, `frontWaistLengthMm`, `neckShoulderToBustPointMm`, `bustPointWidthMm`,
`shoulderWidthMm`, `armscyeDepthMm`, `armLengthMm`. Une mesure absente est estimée par un rapport aux corps
moyens (hommes/femmes, ANSUR II) et listée dans `GarmentSpec.estimatedMeasurements`.

## Pièces de coupe (`CutPattern`)

Patron augmenté de valeurs de couture par bord, crans, droit fil et pliure. Contrat :
`contracts/schemas/manufacturing/cut-pattern.schema.json`. Chaque pièce porte :

- valeur de couture (`seamAllowanceMm`) par bord, en millimètres ;
- ligne de couture et ligne de coupe décalées ;
- crans demandés (bord, distance, nombre) ou automatiques (jonctions de coutures) ;
- droit fil (`grainline` : vecteur) et pliure optionnels ;
- rectangle englobant et aire, pour le plan de coupe.

Options de finition par défaut : couture 10 mm, ourlet 30 mm, tissu plié, sur épaisseur.

## Plan de coupe (`CuttingPlan`)

Placement sur tissu de les pièces de coupe : position (x, y), rotation, duplication (paire, pliure).
Contrat : `contracts/schemas/manufacturing/cutting-plan.schema.json`. Résultats : métrage en millimètres
(arrondi au-dessus), efficience (0 à 1), liste des placements triée par décroissante de longueur/largeur.

## Exports (SVG, PDF, DXF)

Routes `POST /v1/exports` avec `format` (`svg`, `pdf-a4-tiled`, `dxf-aama`) et spécifications
(pièces de coupe, plan de coupe, optionnellement la gradation). Résultats binaires :

- **SVG 1:1** : XML avec coordonnées en mm, `viewBox` en mm, y inversé (affichage haut-bas), textes droits,
  texte de la requête échappé (XML) ;
- **PDF A4 tuilé** (1.18b) : pages 210 × 297 mm, zones 190 × 277 mm, repères de raccord, marges, indices de
  pages, carré de contrôle 100 mm page 1 ;
- **DXF-AAMA R12 ASCII** (1.18c) : unités métriques, blocs AAMA numérotés, calques normalisés.

Tous les formats sont reproductibles octet pour octet (pas de date ni de dépendance d'exécution de la
bibliothèque) ; première version : SVG. Erreurs RFC 9457 si le format n'est pas livré ou si les entrées sont
invalides.
