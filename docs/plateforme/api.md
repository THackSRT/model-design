# API

Les applications parlent aux services en HTTP + JSON, à travers la passerelle (`/api/<service>/…` ; en local,
nginx du studio sur http://localhost:8080). Les contrats OpenAPI de `contracts/openapi/` font foi ; cette page en
donne l'essentiel.

## Service `designs` — modèles et patrons

| Méthode et chemin                              | Rôle                                                                         | Réponses                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| `GET /health`                                  | Sonde de santé                                                               | 200                                     |
| `POST /v1/designs`                             | Créer un modèle (`name`, `garmentType`)                                      | 201 `Design`, 400                       |
| `GET /v1/designs/{designId}`                   | Lire un modèle                                                               | 200 `Design`, 404                       |
| `POST /v1/designs/{designId}/versions`         | Créer une version : calcule le patron à partir des mesures et des paramètres | 201 `DesignVersion`, 400, 404, 422, 502 |
| `GET /v1/designs/{designId}/versions/{number}` | Lire une version et son patron                                               | 200 `DesignVersion`, 404                |

Mêmes mesures et mêmes paramètres donnent la même empreinte (`fingerprint`), quel que soit l'ordre des champs.
Chaque nouvelle version publie l'événement `design.versioned`.

```bash
curl -s -X POST localhost:8080/api/designs/v1/designs \
  -H 'content-type: application/json' -d '{"name":"Jupe MOD-002","garmentType":"straight-skirt"}'

curl -s -X POST localhost:8080/api/designs/v1/designs/<id>/versions -H 'content-type: application/json' -d '{
  "measurements": {"sex":"female","statureMm":1650,"chestGirthMm":880,"waistGirthMm":700,"hipGirthMm":960},
  "garment": {"type":"straight-skirt","params":{"lengthMm":600}}
}'
```

## Moteur `patterning`

| Méthode et chemin   | Rôle                                           | Réponses               |
| ------------------- | ---------------------------------------------- | ---------------------- |
| `GET /health`       | Santé et version du moteur                     | 200                    |
| `POST /v1/patterns` | Mesures + paramètres → spécification de patron | 200 `GarmentSpec`, 422 |

Les moteurs ne sont pas exposés aux applications : seuls les services les appellent.

## Erreurs

Toutes les erreurs suivent la RFC 9457 (`application/problem+json`), avec un `type` stable que les applications
traduisent :

| `type`                                                      | Statut | Sens                                                                 |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `/problems/invalid-request`                                 | 400    | La requête ne respecte pas le contrat (`errors` détaille les champs) |
| `/problems/invalid-name`                                    | 400    | Nom de modèle vide ou trop long                                      |
| `/problems/design-not-found`, `/problems/version-not-found` | 404    | Inconnu, ou appartenant à une autre organisation                     |
| `/problems/garment-type-mismatch`                           | 422    | Paramètres d'un autre type de vêtement que le modèle                 |
| `/problems/pattern-impossible`                              | 422    | Mesures valides mais patron impossible à tracer                      |
| `/problems/engine-unavailable`                              | 502    | Le moteur de patronage ne répond pas ou répond hors contrat          |
| `/problems/internal-error`                                  | 500    | Erreur imprévue (sans détail interne)                                |
