# Changelog

Les changements visibles de la plateforme, du plus récent au plus ancien. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; les versions suivent les phases du projet
(`0.<phase>.<livraison>`). Chaque demande de fusion qui change un comportement ajoute une ligne sous
**Non publié** ; la section est datée et numérotée à chaque livraison.

## [Non publié]

### Ajouté

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
- Contrats (1.36) : générateur émet une constante par schéma (`<clé>JsonSchema`), `jsonSchemas` conservé ;
  `sideEffects: false` dans contracts-ts ; studio : paquet d'entrée 360,71 kB (gzip 109,82) → 319,03 kB
  (gzip 99,58). Avec le banc d'essai, chargé à la demande (1.39j), l'entrée est à 338,25 kB (gzip 104,88).
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
- Repères d'épaule et de poignet, axes des bras du mannequin (`landmarksMm.shoulder`, `.wrist` ; `armsMm`
  par bras : pivot, poignet, axe unitaire, longueur) pour habillage géométrique précis (1.35).
- Studio : vêtement porté sur le mannequin, habillage géométrique (1.34b) ; vue 3D translucide avec zones
  trop justes teintées, silhouette en trait superposée ; affichage texte des zones ; bascule « Montrer le
  vêtement ».
- Liste et comparaison des versions d'un modèle : `GET /v1/designs/{id}/versions` (résumés récents d'abord,
  curseur opaque, pas de mesures) et `GET .../versions/{n}/changes?since=` (différences de paramètres et
  de mesures, organisation propriétaire seulement, `no-store`, 1.16a) ; aucune migration (ADR 0014).
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

### Modifié

- Moteur drapé (1.19b) : devient TypeScript (`@atelier/drape`, paquet) au lieu de Python (ADR 0013,
  exception à l'ADR 0003) ; squelette Python supprimé ; simulation sur CPU seulement pour l'instant.
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
