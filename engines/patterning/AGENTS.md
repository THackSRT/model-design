# Moteur patterning (moteur de référence)

Rôle : mesures + paramètres → spécification de patron (`GarmentSpec`, mm). Sans état, déterministe.
Contrat : `contracts/openapi/patterning.yaml`. Temps visé : moins d'une seconde.

- `core/` : calcul pur : `body.py` (mesures complétées, rapports d'estimation), `curves.py` (tangentes, arcs, découpe
  à une longueur), `checks.py` (contours, coutures avec embu, crans ; une violation = `PatternCheckError`, bogue),
  `drafting.py` (type de vêtement → tracé, contrôle de chaque sortie ; type sans tracé = 422
  `garment-type-not-supported`), `errors.py`, jupe droite provisoire ; interdit d'y importer FastAPI, Pydantic ou les
  contrats (vérifié par `.importlinter`).
- `spec/request.py` (requête → entrées du cœur) et `spec/convert.py` (patron → `GarmentSpec`) : seuls endroits qui connaissent le format des contrats.
- `api/routes.py` : valide avec les modèles générés, appelle le cœur, traduit `DraftingError` en RFC 9457.
- Tests : `tests/unit`, `tests/property` (Hypothesis : contours fermés, coutures de même longueur),
  `tests/golden` (toute différence échoue ; `UPDATE_GOLDEN=1` seulement avec l'accord du modéliste), `tests/api`.
- Changer un calcul = changer `ENGINE_VERSION` (elle entre dans l'empreinte et le cache).
- Commandes : `pnpm nx run patterning:test|lint|typecheck|dev`.
