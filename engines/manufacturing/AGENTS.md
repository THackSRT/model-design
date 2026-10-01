# Moteur manufacturing

Rôle : rendre la spécification utilisable en atelier — valeurs de couture, crans, gradation, plan de coupe,
exports SVG 1:1, PDF A4 tuilé, DXF-AAMA (phase 1, voir le tableau des travaux, docs/suivi/travaux.md). Entrées : `GarmentSpec`, tailles,
laize. Temps visé : 1 à 30 s (imbrication en tâche).

- Contrat : `contracts/openapi/manufacturing.yaml` (schémas dans `contracts/schemas/manufacturing/`). Décision :
  `docs/adr/0009-moteur-de-fabrication.md`.
- Port local : 3202 (`pnpm nx run manufacturing:dev`). Version : `ENGINE_VERSION` (`src/manufacturing/__init__.py`),
  à changer avec tout calcul modifié.
- Routes livrées : `GET /health` ; `POST /v1/cut-patterns` (pièces de coupe : lignes de couture et de coupe, crans,
  droit fil, pliure, ancre d'étiquette, rectangle englobant, aire). Gradation, plan de coupe et exports : à venir.
- `POST /v1/cutting-plans` : plan de coupe (`core/cutting_plan.py` pièces, rotation au droit fil, pliure, efficience ;
  `core/nesting.py` ligne d'horizon sur rectangles englobants) ; erreurs `fold-not-on-grain`,
  `piece-wider-than-fabric`, `too-many-pieces` (500 placements au plus) ; pas de retournement à 180° (v1).
- `POST /v1/graded-patterns` : gradation par recalcul (`core/grading.py`) ; une spécification par taille, mêmes
  réglages de finition, alignement `origin` ou `grainline`, écarts (dx, dy) du début de chaque bord sur la couture
  par rapport à la base ; erreur `sizes-mismatch` (base absente, taille en double, pièces ou bords différents).
- Structure : `core/` calcul pur et déterministe (ni E/S, ni horloge, ni hasard) : `geometry`, `offset`,
  `allowances` (valeurs de couture, ligne de coupe), `notches`, `finishing` (droit fil, pliure, étiquette) ;
  `spec/` conversions avec les contrats (`cut_patterns.py`) ; `api/` FastAPI, un module par ressource
  (`cut_patterns.py`) ; `main.py` : assemblage. Les frontières sont vérifiées par import-linter.
- `POST /v1/exports` : `format: "svg"` rend une planche SVG 1:1 (mm, `image/svg+xml`, `Content-Disposition`
  `<garment.type>[-<sizeLabel>].svg`, octet pour octet identique) ; `pdf-a4-tiled` et `dxf-aama` : 422
  `export-format-unavailable` jusqu'à 1.18b et 1.18c. Paquet `export/` (pur, rend des `bytes`) : `sheet.py` (planche
  en étagères, réutilisée par PDF et DXF), `svg.py`, `labels.py` (annotations par langue, `fr`) ; la répartition par
  format est le dictionnaire `EXPORTERS` de `export/__init__.py`. Tout texte de la requête est échappé en XML.
  Référence golden : `tests/golden/straight-skirt.svg` (test dans `tests/api/test_reference_svg.py`).
- Crans : demandés (`finishing.notches`), de la spécification (`Panel.notches`, traités comme demandés, source
  `requested`) et automatiques `seam-junctions` ; priorité à un même endroit : demande > spécification > auto.
- Pinces : deux bords consécutifs cousus l'un à l'autre (couture dont a et b sont sur la même pièce). Valeur de couture 0 sur les jambes (une valeur non nulle explicite : `allowance-on-dart`) ; la ligne de coupe franchit la pince par un pont (corde, valeur = max des deux bords voisins), la ligne de couture garde les jambes ; crans automatiques aux deux bouts du pont.
- Erreurs (422, `application/problem+json`) : `open-contour`, `unknown-edge`, `allowance-on-fold`,
  `allowance-on-dart`, `adjacent-darts`,
  `notch-outside-edge`, `fold-edge-missing`, `cut-line-self-intersects`.
- Tests : `tests/` (`unit/`, `property/` avec Hypothesis, `api/`, `golden/`). Fixture d'entrée :
  `tests/fixtures/straight-skirt-spec.json` (jupe droite du moteur de patronage) ; référence golden :
  `tests/golden/straight-skirt-cut-pattern.json` (à valider par le modéliste ; `UPDATE_GOLDEN=1` seulement avec son accord).
- Commandes : `pnpm nx run manufacturing:test`, `…:lint`, `…:typecheck`, `…:dev`.
- Modèle à suivre : `engines/patterning`.
