# Moteur __name__

Rôle : (une phrase). Entrées : (schéma). Sorties : (schéma). Temps visé : (…).

- `core/` : calcul pur et déterministe (ni E/S, ni horloge, ni hasard) ; `spec/` : conversions avec les
  contrats ; `api/` : FastAPI ; `main.py` : assemblage. Les frontières sont vérifiées par import-linter.
- Tests : `tests/` (unitaires, propriétés avec Hypothesis, références golden).
- Commandes : `pnpm nx run __name__:test`, `…:lint`, `…:typecheck`, `…:dev`.
- Modèle à suivre : `engines/patterning`.
