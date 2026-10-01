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
- Structure : `core/` calcul pur et déterministe (ni E/S, ni horloge, ni hasard) : `geometry`, `offset`,
  `allowances` (valeurs de couture, ligne de coupe), `notches`, `finishing` (droit fil, pliure, étiquette) ;
  `spec/` conversions avec les contrats (`cut_patterns.py`) ; `api/` FastAPI, un module par ressource
  (`cut_patterns.py`) ; `main.py` : assemblage. Les frontières sont vérifiées par import-linter.
- Crans : demandés (`finishing.notches`), de la spécification (`Panel.notches`, traités comme demandés, source
  `requested`) et automatiques `seam-junctions` ; priorité à un même endroit : demande > spécification > auto.
- Erreurs (422, `application/problem+json`) : `open-contour`, `unknown-edge`, `allowance-on-fold`,
  `notch-outside-edge`, `fold-edge-missing`, `cut-line-self-intersects`.
- Tests : `tests/` (`unit/`, `property/` avec Hypothesis, `api/`, `golden/`). Fixture d'entrée :
  `tests/fixtures/straight-skirt-spec.json` (jupe droite du moteur de patronage) ; référence golden :
  `tests/golden/straight-skirt-cut-pattern.json` (à valider par le modéliste ; `UPDATE_GOLDEN=1` seulement avec son accord).
- Commandes : `pnpm nx run manufacturing:test`, `…:lint`, `…:typecheck`, `…:dev`.
- Modèle à suivre : `engines/patterning`.
