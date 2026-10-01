# 0014 — Versions d'un modèle (liste, comparaison) et erreurs relayées du moteur de patronage

**Contexte.** Le studio doit retoucher un modèle : lister ses versions, en reprendre une, en créer une nouvelle et
comparer deux versions (travail 1.16). Une version contient les mesures d'un client (données personnelles) et une
spécification de patron. Par ailleurs, `designs` relaie tout 422 du moteur de patronage en
`/problems/pattern-impossible`, alors que le moteur rend des types précis et que le studio sait les traduire
(travail 1.32). L'ADR 0012 a fixé, pour la fabrication, une liste blanche de types relayés.

**Décision.**

- **Erreurs du patronage** : le contrat du moteur (`patterning.yaml`) liste ses types stables. `designs` relaie
  tels quels, avec leur détail, ceux de sa liste (`measurement-required`, `inconsistent-measurements`,
  `garment-type-not-supported`, `skirt-shorter-than-hip-depth`, `trousers-shorter-than-crotch`,
  `trousers-hem-too-narrow`, `neckline-too-deep`, `sleeve-shorter-than-cap`). Un autre type `/problems/…` du
  moteur reste un 422 `/problems/pattern-impossible`, avec un détail fixé par le service : ce type existe déjà
  au contrat (changement compatible) et « moteur indisponible, réessayez » serait faux pour un patron que les
  valeurs rendent impossible. Écart assumé avec l'ADR 0012, où tout type inconnu devient 502 : la fabrication
  n'avait pas de type générique publié. Un 422 de validation du moteur (sans type `/problems/`), un délai
  dépassé ou une réponse hors contrat donnent 502 `/problems/engine-unavailable` ; ce corps (FastAPI y recopie
  les valeurs reçues, donc des mesures) n'est ni relayé ni journalisé.
- **Liste des versions** : `GET /v1/designs/{id}/versions`, numéro décroissant, pagination par curseur
  (directive des contrats) : `limit` (1 à 100, 20 par défaut), `cursor` opaque pour le client ; le service y met
  le numéro de la dernière version rendue (les numéros sont denses), sans migration (clé primaire
  `(design_id, number)`). Les éléments sont des résumés (`DesignVersionSummary` : numéro, date, empreinte,
  version du moteur, type et paramètres) : ni mesures ni patron.
- **Comparaison** : `GET /v1/designs/{id}/versions/{n}/changes?since={m}` rend les différences d'entrées
  (`DesignVersionChanges`) : paramètres (chemin pointé) et mesures, valeurs telles qu'envoyées, triées, plus
  `sameFingerprint`. Le service compare ce qu'il possède : des données. Mesures comprises, donc réservé à
  l'organisation propriétaire (404 sinon) et `Cache-Control: no-store`, comme la lecture d'une version.
- **La géométrie se compare dans le studio** : le modèle de vue lit les deux versions (`GET` existant, il lui
  faut les patrons pour les dessiner) et calcule par pièce (même `id`) aire et périmètre, courbes aplaties,
  pour l'affichage seulement. Pas d'algorithme géométrique dans un service ; pas de champ ajouté à
  `GarmentSpec`, qui changerait la version du moteur et ses références golden. Une mesure qui ferait foi (ex.
  consommation de tissu) viendra du moteur de fabrication, par une autre décision.
- **Retoucher = créer une version** : une version est immuable ; le studio recharge mesures et paramètres
  d'une version dans son formulaire, puis appelle `POST …/versions` comme aujourd'hui.

**Conséquences.** Un nouveau type d'erreur du moteur n'atteint l'écran qu'après son ajout à la liste du
contrat `designs` et au catalogue du studio ; d'ici là il s'affiche en « patron impossible ». Comparer deux
versions coûte trois lectures au studio (deux versions, une comparaison) : négligeable en local. Le curseur
n'étant qu'un numéro, il ne cache rien : le contrôle d'accès reste celui du modèle. La liste des modèles d'une
organisation (pour retrouver un modèle après rechargement de la page) reste à décider.
