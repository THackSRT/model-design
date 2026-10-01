# 0012 — Fabrication via `designs` : pièces et exports relayés, sans cache pour l'instant

**Contexte.** Le studio doit montrer les pièces de coupe d'une version de modèle et télécharger ses exports
(SVG 1:1, PDF A4 tuilé, DXF-AAMA ; travaux 1.29 et 1.30). Le moteur de fabrication n'est appelé que par les
services (ADR 0001, 0009) et la spécification de patron appartient à `designs`. Il faut décider qui relaie,
comment passe un fichier binaire, quelles erreurs remontent, s'il faut un cache (résultats dérivés des mesures
d'un client) et comment la pile locale branche le moteur, sans dépense (ADR 0006).

**Décision.**

- **`designs` est la porte** : `POST /v1/designs/{id}/versions/{n}/cut-patterns` (corps `CutPatternOptions`,
  réponse `CutPattern` du contrat de fabrication, par `$ref`) et `POST …/exports` (corps
  `DesignExportRequest` : `format`, `finishing`, `sizeLabel`, `reference` ; réponse : le fichier). Le service lit
  la version dans l'organisation de l'appelant (404 sinon), envoie sa `GarmentSpec` au moteur et ne stocke rien.
  Un seul appel synchrone en aval.
- **Relais binaire** : `requestJson` lit le corps en texte et abîmerait un PDF. `@atelier/service-kit` reçoit un
  `requestBytes` (même délai par `AbortSignal.timeout`, sans reprise, taille lue bornée, 20 Mio par défaut), seul
  point d'accès HTTP binaire des services. Type de contenu et `Content-Disposition` sont fixés par `designs`
  depuis des valeurs contrôlées (`<garmentType>-v<n>[-<taille réduite à a-z0-9->].<ext>`), jamais recopiés du
  moteur ; plus `X-Content-Type-Options: nosniff`.
- **Erreurs** : les 422 du moteur gardent leur `type` stable s'il figure dans la liste du contrat `designs`
  (`unknown-edge`, `allowance-on-fold`, `allowance-on-dart`, `adjacent-darts`, `notch-outside-edge`,
  `open-contour`, `fold-edge-missing`, `cut-line-self-intersects`, `export-format-unavailable`) ; tout autre
  type, une erreur de validation du moteur, un délai dépassé ou une réponse hors contrat (`CutPattern` revalidé
  par Ajv) donnent 502 `/problems/engine-unavailable`. La liste blanche évite qu'un texte libre du moteur
  devienne une clé de l'interface. Le même mécanisme servira au moteur de patronage (travail 1.32), quand son
  contrat listera ses types stables.
- **Pas de cache** pour l'instant : le moteur est déterministe et répond sous la seconde dans les bornes du
  contrat (ADR 0009) ; un cache garderait en plus des données dérivées des mesures. Les réponses portent
  `Cache-Control: no-store`. Le jour où une mesure montre un besoin (p95 au-delà de 500 ms, ou un moteur lent),
  le cache ira dans Valkey (déjà dans la pile locale), clé = SHA-256 de (empreinte de la version, options,
  `engineVersion` lu sur `/health` du moteur), durée de vie courte, par une nouvelle ADR.
- **Configuration** : `MANUFACTURING_URL` (défaut `http://localhost:3202`, `http://manufacturing:8000` dans la
  pile) et `MANUFACTURING_TIMEOUT_MS` (défaut 2000, comme le patronage ; le plan de coupe, plus long, n'est pas
  relayé ici). Dans `platform/docker-compose.yml`, `designs` reçoit ces variables et dépend de `manufacturing`
  (`service_healthy`). Le service démarre sans le moteur : seules ces deux routes répondent 502.

**Conséquences.** Les applications ne connaissent qu'un service ; le contrat de fabrication reste la seule
définition des pièces (pas de copie). Chaque calcul est refait à la demande : coût négligeable en local, à
mesurer avant d'ajouter un cache. Un nouveau type d'erreur du moteur n'atteint l'écran qu'après son ajout à la
liste du contrat `designs` (changement compatible) et au catalogue du studio. Le plan de coupe et la gradation
passeront par une autre décision (plusieurs versions ou tailles, durée plus longue, peut-être en tâche).
