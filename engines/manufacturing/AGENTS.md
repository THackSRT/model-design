# Moteur manufacturing

Rôle : rendre la spécification utilisable en atelier — valeurs de couture, crans, gradation, plan de coupe,
exports SVG 1:1, PDF A4 tuilé, DXF-AAMA (phase 1, voir le tableau des travaux, docs/suivi/travaux.md). Entrées : `GarmentSpec`, tailles,
laize. Temps visé : 1 à 30 s (imbrication en tâche).

- `core/` : calcul pur et déterministe (ni E/S, ni horloge, ni hasard) ; `spec/` : conversions avec les
  contrats ; `api/` : FastAPI ; `main.py` : assemblage. Les frontières sont vérifiées par import-linter.
- Tests : `tests/` (unitaires, propriétés avec Hypothesis, références golden).
- Commandes : `pnpm nx run manufacturing:test`, `…:lint`, `…:typecheck`, `…:dev`.
- Modèle à suivre : `engines/patterning`.
