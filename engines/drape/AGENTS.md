# Moteur drape

Rôle : coudre virtuellement les pièces sur l'avatar et simuler le tombé (NVIDIA Warp, GPU ; version CPU
pour les tests). Entrées : `GarmentSpec`, avatar, tissu. Sorties : glTF, carte d'aisance. Temps visé : 5 à 60 s,
en tâche NATS (phase 1, voir le tableau des travaux, docs/suivi/travaux.md).

- `core/` : calcul pur et déterministe (ni E/S, ni horloge, ni hasard) ; `spec/` : conversions avec les
  contrats ; `api/` : FastAPI ; `main.py` : assemblage. Les frontières sont vérifiées par import-linter.
- Tests : `tests/` (unitaires, propriétés avec Hypothesis, références golden).
- Commandes : `pnpm nx run drape:test`, `…:lint`, `…:typecheck`, `…:dev`.
- Modèle à suivre : `engines/patterning`.
