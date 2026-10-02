# AGENTS.md — py/engine-kit

Fabrique commune des moteurs Python (`create_engine_app`) : `/health`, journaux, erreurs RFC 9457.

## Problèmes rendus (`application/problem+json`)

- `EngineError(kind, detail)` : 422 `/problems/<kind>`, entrées valides mais impossibles à traiter.
- Requête hors schéma (`RequestValidationError`) : 422 `/problems/invalid-request`, `title`, `status`,
  `detail` (nombre d'erreurs) et `errors` : au plus 20 entrées `{path, constraint}` (chemin JSON sans le
  préfixe `body`, type de contrainte Pydantic). **Jamais la valeur reçue** : elle peut être une mesure de client.
