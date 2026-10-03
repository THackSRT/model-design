# Changelog

Les changements visibles de la plateforme, du plus récent au plus ancien. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; les versions suivent les phases du projet
(`0.<phase>.<livraison>`). Chaque demande de fusion qui change un comportement ajoute une ligne sous
**Non publié** ; la section est datée et numérotée à chaque livraison.

## [Non publié]

### Ajouté

- Studio : panneau Drapé dans l'onglet Patron (1.49) : sept préréglages de tissu (popeline par défaut),
  demande en brouillon avec bras à 30°, interrogation toutes les 2 s, affichage du drapé 3D sur l'avatar
  (GLB lu par un lecteur minimal, zones à aisance négative teintées), bascule « Montrer le drapé » ; ajustement « de consultation »
  (`fitForView`) qui ne remplace pas le corps de l'habillage ; paquet d'entrée +2,32 kB gzip.
- Banc d'essai des tissus (ADR 0015, 1.39) : contrats (`fabric-physics`, `fabric-bench-measurements`,
  `fabric-derived-values`, `fabric-preset-review`, `fabric-validation-report`) et langage commun ; moteur :
  essais d'atelier (pesée, épaisseur, allongement, rigidité, frottement, tolérances, écarts), essai de drapé
  de Cusick simulé (0,75–2 s, coefficient de drapé) ; features : modèle de vue `useFabricBench`,
  import/export du rapport, validateur JSON Schema ; ui-web : composants `Tabs`, `TextArea`, `ChoiceGroup`,
  `FileButton` ; studio : onglets Patron | Tissus, écran du banc d'essai avec Worker de Cusick et vue de
  dessus (1.39a–j).
- Moteur drapé (ENGINE_VERSION 0.3.0, 1.37) : λ cumulé par sous-pas (XPBD correct), option `iterations`
  (1–32), validation des maillages (`InvalidInputError`, code `'mesh'` | `'settings'`).
- Studio : un Worker d'ajustement qui plante est recréé et la demande relancée une fois ; le dernier
  ajustement est rejoué sur un Worker neuf avant un habillage (1.38).
- Contrats (1.36, 1.40) : générateur émet une constante par schéma (`<clé>JsonSchema`), `jsonSchemas` conservé ;
  `sideEffects: false` dans contracts-ts ; un module généré par schéma JSON (`generated/json-schemas/<nom>.ts`,
  1.40), noms exportés inchangés ; studio : paquet d'entrée 360,71 kB (gzip 109,82) → 319,03 kB (gzip 99,58)
  après 1.36, puis 338,25 kB (gzip 104,88) avec le banc d'essai chargé à la demande (1.39j), puis 324,20 kB
  (gzip 99,66) après 1.40, puis 338,05 kB (gzip 104,63) avec le panneau d'historique (1.16c).
- Manufacturing (1.33) : références golden lues/écrites en octets, JSON et SVG en LF, DXF en CRLF, PDF
  binaire (`.gitattributes`) ; aucune valeur changée.
- Contrat du drapé physique (1.19a, compatibilité `specVersion: 1.0`) : `Panel.placement` (zone, côté, sens,
  ancrage, aisance), tissu (sept préréglages + surcharges), schémas avatar et qualité ; routes `…/drapes`
  (demander, lire, télécharger), événements `drape.requested`, `drape.completed`, `drape.failed` ; aucune
  mesure journalisée (ADR 0013).
- Moteur drapé (port 3203, ENGINE_VERSION 0.2.0, 1.19b) : cœur de simulation XPBD sur CPU en TypeScript,
  sans dépendance de calcul (ADR 0013) ; étirement anisotrope chaîne/trame, flexion isométrique, coutures,
  collision et frottement, arrêt au repos ou nombre d'itérations fixé ; déterministe (Float64Array, ordre
  fixe, seulement + − × ÷ √ abs min max) ; tests physiques (chute libre, bande suspendue, porte-à-faux,
  sphère, plan incliné, coutures, frottement) ; `/health` (nom, version). Maillage, glTF, cache S3, tâche
  NATS à venir (1.19d–g).
- Placement de chaque pièce autour du corps (1.19c, ENGINE_VERSION 0.6.0) : `Panel.placement` pour jupes,
  pantalon et corsage ; convention des coutures vérifiée par tests ; références golden régénérées (placement
  ajouté, aucune coordonnée changée).
- Maillage triangulaire des pièces et du vêtement complet (1.19d–d2, ENGINE_VERSION 0.4.0) : Delaunay
  contrainte (pas de 25 mm en brouillon, 15 mm en standard, angle minimal > 20°) ; vêtement complet
  à plat `meshGarment` avec pièces sur pliure dépliées, copies miroir pour `quantity: 2`, coutures appariées
  point à point, droit fil par triangle ; limites (40 pièces, 2 000 bords, 30 000 sommets, 200 coutures,
  coordonnées à 10 m) vérifiées avant tout travail coûteux, contre une entrée hostile ; cinq vêtements de
  référence se maillent en 0,02 à 0,17 s (jupe cercle standard : 9 756 sommets) ; ADR 0013 complétée.
- Drapé de l'avatar (1.19e, ENGINE_VERSION 0.5.0) : `drapeGarment(job)` recalcule le mannequin depuis les
  mesures et les options (`@atelier/mannequin`, seul import autorisé) ; place chaque pièce autour du corps selon
  `Panel.placement` ; simule, puis rend l'aisance par sommet, l'allongement maximal et la convergence, ou un
  problème typé (`placement-missing`, `placement-failed`, `seam-not-closed`, `body-penetration`,
  `drape-too-large`). Jupe droite en brouillon
  drape correctement (convergence 116 pas, aucune pénétration, aisance bassin ~6 mm) ; autres vêtements non
  maintenus (tâche 1.19e2 : ceinture/épaules, pantalon jambe par jambe, réglages par type).
- Repères d'épaule et de poignet, axes des bras du mannequin (`landmarksMm.shoulder`, `.wrist` ; `armsMm`
  par bras : pivot, poignet, axe unitaire, longueur) pour habillage géométrique précis (1.35).
- Studio : vêtement porté sur le mannequin, habillage géométrique (1.34b) ; vue 3D translucide avec zones
  trop justes teintées, silhouette en trait superposée ; affichage texte des zones ; bascule « Montrer le
  vêtement ».
- Liste et comparaison des versions d'un modèle : `GET /v1/designs/{id}/versions` (résumés récents d'abord,
  curseur opaque, pas de mesures) et `GET .../versions/{n}/changes?since=` (différences de paramètres et
  de mesures, organisation propriétaire seulement, `no-store`, 1.16a) ; aucune migration (ADR 0014).
- Historique des versions du modèle de la session : features clients `listVersions`, `getVersion`,
  `getVersionChanges` et modèle de vue `useDesignHistory` (liste paginée par curseur, reprise dans le
  formulaire, comparaison : changements du service + aire et périmètre par pièce calculés pour l'affichage,
  1.16b) ; studio : panneau « Historique » repliable dans l'onglet Patron avec liste des versions de la
  session, « charger plus », reprendre une version avec confirmation si le formulaire contient des
  modifications non calculées, et comparer deux versions (changements libellés, écarts d'aire en cm² et de
  périmètre en cm par pièce, pièces ajoutées/retirées, 1.16c) ; tous les libellés traduits pour les mesures
  du contrat (ADR 0014 : l'historique est limité au modèle de la session, pas de stockage navigateur).
- Erreurs précises du moteur de patronage relayées (1.32) : huit types stables du contrat remontés en 422 avec
  détail ; autre type du moteur → 422 `/problems/pattern-impossible` (détail fixé) ; validation, délai, panne
  → 502 `/problems/engine-unavailable` sans relayer le corps (ADR 0014).
- Moteur `manufacturing` (port 3202, ENGINE_VERSION 0.4.0) : pièces de coupe avec valeurs de couture par bord,
  crans demandés ou automatiques, droit fil et pliure ; gradation par recalcul ; plan de coupe simple et
  déterministe ; exports SVG 1:1 (1.18a), PDF A4 tuilé (1.18b) et DXF-AAMA (1.18c) ; routes RFC 9457 typées.
- Patronage : quatre types de vêtements (`straight-skirt`, `circle-skirt`, `trousers`, `bodice`) et douze mesures
  facultatives (ISO 8559-1) ; GarmentCode réécrit en Python pur sans dépendance nouvelle (ADR 0010) : jupe droite
  à pinces, jupe cercle, pantalon et corsage avec ou sans manches, coutures justes à 0,5 mm près ; mesures
  obligatoires par type, estimations déclarées ; références « candidates » à valider par le modéliste.
- `designs` accepte les quatre types de modèle et sert les pièces de coupe et les exports SVG, PDF A4 et DXF d'une
  version (`POST …/versions/{n}/cut-patterns` et `…/exports`, ADR 0012) en relayant le moteur de fabrication.
- Studio : `three.js` chargé à la demande dans un `Suspense` (`lazy-mannequin-view.tsx`, paquet initial réduit de
  806 kB à 303 kB) ; messages ICU avec pluriels, genres et formatage de nombres (ADR 0011) ; erreurs de saisie
  affichées sous les champs (`intl-messageformat` v12.1.2, BSD-3).
- Studio : pièces de coupe affichées (SVG), téléchargements (SVG, PDF A4 tuilé, DXF-AAMA), choix du type
  de vêtement et formulaires dynamiques (1.30, 1.31).
- Hook `pre-push` activé sous Windows (script `prepare` en Node, sans Git Bash externe).
- Licence permise PSF-2.0 ajoutée (typing_extensions, requise par Pydantic).
- Service `docs` dans `platform/docker-compose.yml` (profil « app », `pnpm stack:up`) : documentation MkDocs
  construite puis servie par nginx sur http://localhost:8000.
- Documentation MkDocs de la plateforme (`pnpm docs:serve`) : architecture, directives de codage, plateforme,
  composants, décisions, tableau des travaux et ce changelog.
- Conteneurs Docker pour chaque moteur, service et application ; pile locale complète avec
  `pnpm stack:up` (studio et passerelle locale sur http://localhost:8080).
- Hook git `pre-push` qui lance `pnpm check:affected` : les vérifications tournent en local (ADR 0006).
- Orchestration Claude Code : huit sous-agents répartis entre Opus, Sonnet et Haiku, skills `/planifier`,
  `/livrer`, `/cloturer` et permissions partagées (`CLAUDE.md`, `.claude/`, ADR 0007).
- Repères de hauteur du mannequin (`landmarksMm`) : crotch, hip, waist, neck, knee, ankle ; ajustement de
  l'entrejambe sur `crotchHeightMm` (plage 740–835 mm pour 1700 mm de stature).
- Ajustement du mannequin dans un Web Worker (`apps/studio`) : l'écran du studio n'est plus figé pendant le
  calcul ; indicateur « ajustement en cours » ; un échec du mannequin n'empêche pas le patron.
- Bascule 3D / silhouettes 2D (face, profil, dos) dans le studio de patron : vue mannequin interactive ou
  silhouettes vectorielles au choix.
- Service `designs` branche son relais de l'outbox sur NATS JetStream : flux `DESIGNS` (sujets `design.>`),
  variables `NATS_URL`, `OUTBOX_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, arrêt propre avec `SIGTERM/SIGINT`.
- Relais générique de l'outbox vers NATS JetStream (`@atelier/service-kit`) : au moins une fois,
  déduplication par `Nats-Msg-Id` (ADR 0008).
- Moteur drapé : sorties sans E/S (1.19f1) : GLB 2.0 déterministe en mètres, une primitive par exemplaire de
  pièce, attributs `_EASE_MM` et `_STRAIN` ; clé de cache SHA-256, contenu de `drape.completed` et
  `drape.failed` ; `invalid-input` publié comme `drape-internal`.
- Moteur drapé : travailleur NATS (1.19f2) : consommateur durable `drape` sur flux `DRAPE_JOBS`, calcul dans un
  `worker_thread`, signaux de travail ; écriture du GLB et d'un JSON de résultat sans mesure dans S3, publication
  de `drape.completed` / `drape.failed` en enveloppe CloudEvents (id UUID v8 déterministe, `Nats-Msg-Id` stable) ;
  dépendances `@nats-io/jetstream`, `@nats-io/transport-node`, `aws4fetch`.
- Routes du drapé dans `designs` (1.19g1) : `POST …/versions/{n}/drapes` (202 création + événement
  `drape.requested` par l'outbox ; 200 pour demande identique, idempotent) ; `GET …/drapes/{drapeId}` (statut ;
  `drape-timeout` après 10 min, calculé à la lecture) ; migration 0002_drapes ; flux `DRAPE_JOBS` (24 h).
- Consommateur des résultats drapé dans `designs` (1.19g2) : événements `drape.completed` / `drape.failed` sur
  flux `DRAPE` (consommateur durable `designs-drape`, premier résultat gagne) ; `GET …/drapes/{drapeId}/model` : modèle glTF depuis S3
  (aws4fetch), 409 si non terminé, 502 si stockage échoue ; variables d'environnement `S3_ENDPOINT`,
  `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET`, `S3_TIMEOUT_MS`.

### Modifié

- Moteur drapé : qualité standard en cible de test à part (1.47, `pnpm nx run @atelier/drape:test-standard`) :
  maillage 15 mm, cinq vêtements, convergence jusqu'à 600 pas, temps réel borné à 60 s, critères du brouillon,
  hors `pnpm check` et hook ; jupe droite et pantalon vert, jupe cercle/corsage/corsage à manches rouge.
- Moteur drapé : pantalon départ symétrique (1.48, ENGINE_VERSION 0.11.0) : `PieceField.span` lit l'étendue
  de l'isoligne au plus à `dMax − 5 mm` (ourlet oblique, maillages miroirs), coutures miroirs ≤ 10 mm d'écart au
  départ, maximum ≤ 95 mm.
- Orchestration Claude Code (1.45, amendement de l'ADR 0007) : `relecteur` sur Sonnet (Opus pour les lots
  sensibles) ; découpage dans la session principale ; vérification, relecture et documentation une fois par
  lot ; commit local par tâche ; fichier d'état `.claude/lot-en-cours.md` et skill `/reprendre` après une
  coupure ou une limite d'usage ; lectures ciblées et comptes rendus courts ; `engines/drape/AGENTS.md`
  allégé (détail dans `docs/composants/drape.md`).
- Contrat du drapé (1.41) : coordonnées d'un `Point` de GarmentSpec bornées à ±10 000 mm (la plus grande
  valeur des références actuelles est 1 506,9 mm) ; patronage et fabrication adaptées ; une coupe hors borne est refusée (422 `/problems/invalid-request`) ;
  un plan de coupe de plus de 10 m reste accepté.
- Service `designs` (1.42) : toutes les requêtes PostgreSQL fixent l'organisation (sécurité au niveau des lignes) ;
  test d'isolation avec un rôle non propriétaire ; service-kit : `StreamDeclaration` gagne `retention` et `maxAgeMs`.
- Service `designs` (1.44) : rôle sans privilège `designs_app` (sécurité par lignes effective dans la pile) ;
  migrations exécutées par le propriétaire (variable `MIGRATION_DATABASE_URL`, exigée avec `MIGRATE_ON_START`) ;
  migration 0003 : `GRANT` des tables au rôle.
- Moteurs Python (1.43) : une requête hors schéma répond 422 `application/problem+json` `/problems/invalid-request`
  (au plus 20 erreurs avec `path` et `constraint`, jamais la valeur reçue) ; designs la traite comme moteur
  indisponible (502).
- Moteur drapé (1.19b) : devient TypeScript (`@atelier/drape`, paquet) au lieu de Python (ADR 0013,
  exception à l'ADR 0003) ; squelette Python supprimé ; simulation sur CPU seulement pour l'instant.
- Moteur drapé : maintien des vêtements lors du drapé (1.19e2a–e2c, ENGINE_VERSION 0.6.0–0.10.0) : test de
  parité pour pénétration mesurée (0.6.0) ; placement le long de la ligne d'ancrage, ceinture tenue pendant la
  couture (0.7.0) ; jupe cercle posée en godets, réglage fin seulement pour les jupes évasées, double passe de
  couture (0.10.0) ; pantalon posé jambe par jambe, convergence et coutures fermées (0.8.0) ; corsage tenu aux
  épaules, succès à 30° ; corsage à manches reste en body-penetration (manche du patron plus étroite que le bras,
  tête de manche plus longue que l'emmanchure, voir 1.46) (0.9.0) ; ADR 0013
  amendée.
- Moteur patronage (1.19c) : ENGINE_VERSION 0.6.0, ajout de `Panel.placement` (zone, côté, sens, ancrage,
  aisance) pour le drapé ; références golden régénérées (ajout seul, aucune coordonnée changée).
- Moteur mannequin remplacé par modules TypeScript testés (geometry, morph, measure, fit, render, pose) ;
  exception au lint levée.
- `engines/patterning` : GarmentCode est la référence de conception, réécrite en Python pur, typé, millimètres,
  sans dépendance nouvelle ; pas d'adaptateur centimètres (aucun code en centimètres).
- Mannequin 3D : la tête garde sa forme naturelle (crâne, joues, mâchoire, menton, oreilles) ; seuls les
  traits du visage (yeux, sourcils, nez, bouche) sont effacés, au lieu de la tête ovoïde de vitrine ;
  le visage est aplati (la bouche et le menton ne dépassent plus le plan du front).
- Stockage objet local : SeaweedFS remplace MinIO, qui ne publie plus d'images depuis octobre 2025.
- Pile Docker (1.19f3) : S3 de développement (SeaweedFS), seau `drapes` créé au démarrage, variables `S3_*` pour
  moteur drapé et service `designs`, ports publiés sur 127.0.0.1 ; essai de bout en bout du drapé réussi (202
  demande, `completed` en ~10 s, modèle GLB téléchargé, demande identique → même drapé).
- L'intégration continue GitHub devient facultative (lancement manuel).
- Nx Cloud (offre gratuite) connecté : le cache des tâches est partagé entre les postes.
- L'installation se lance par `pnpm run setup` (`pnpm setup` seul est une commande de pnpm) et installe aussi
  le groupe Python `docs`.
- Licences permises pour les dépendances : l'Unlicense s'ajoute (`tweetnacl`, requise par le client NATS ;
  ADR 0008).

### Corrigé

- Manufacturing : doublon de cran sur une pièce en miroir (comparaison par position, ENGINE_VERSION 0.3.1 → 0.4.0).
- Dépôt : fichiers `.dxf` et `.pdf` stockés en binaire (`.gitattributes`) pour éviter la conversion LF.
- `pnpm stack:up` sous Windows : le certificat d'autorité facultatif vaut par défaut un fichier vide
  (`platform/empty-ca.crt`) au lieu de `/dev/null`.
- `pnpm check` passe sous Windows : fins de ligne LF imposées (`.gitattributes`, ruff), Prettier lancé sans
  `npx` par le générateur de contrats, UTF-8 pour import-linter, chemins `/` dans les générateurs
  (`$ref` des événements), vérification des jetons sans course entre `test` et `typecheck`.

## [0.1.0] — 2026-09-30 — Architecture initiale

### Ajouté

- Monorepo pnpm + Nx et uv ; frontières d'architecture vérifiées (étiquettes Nx, règles par couche, import-linter).
- Contrats d'abord : JSON Schema, OpenAPI, AsyncAPI ; types TypeScript et modèles Pydantic générés
  (`pnpm contracts:gen`), fraîcheur vérifiée.
- Service `designs` (service de référence) : modèles, versions, patrons ; PostgreSQL avec migrations, sécurité
  par lignes et outbox.
- Moteur `patterning` (moteur de référence) : jupe droite provisoire, tests unitaires, de propriétés et golden.
- Moteur `mannequin` : mannequin MakeHuman ajusté aux mesures, repris du prototype.
- Squelettes des moteurs `manufacturing` et `drape`.
- Studio web : saisie des mesures, patron 2D, mannequin 3D ; bibliothèques de jetons, composants, modèles de vue
  et visionneuse 3D.
- Générateurs `pnpm gen service|engine|event|screen`, `AGENTS.md`, ADR 0001 à 0005.

### Modifié

- Le prototype statique d'origine est déplacé dans `prototype/` et figé.

## [0.0.1] — 2026-09-30 — Prototype

### Ajouté

- Prototype statique : croquis du modèle MOD-001, patrons 1:1, plan de coupe, fiche technique, avatar
  paramétrique en 4 vues, recommandation de taille, mannequin réaliste MakeHuman (dossier `prototype/`).
