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

Le type de vêtement et ses paramètres. Aujourd'hui : `straight-skirt` (jupe droite provisoire).

```json
--8<-- "contracts/schemas/garment-request.schema.json"
```
