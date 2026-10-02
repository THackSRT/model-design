# Moteur drape (TypeScript)

Rôle : faire tomber les pièces cousues d'un vêtement sur l'avatar (dynamique XPBD sur CPU, sans dépendances).
Décision : ADR 0013 (exception à l'ADR 0003 : moteur TypeScript, comme le mannequin). État : socle du paquet, simulation (1.19b), maillage (1.19d),
placements et drapé complet (1.19e) ; glTF, clé de cache et événements (1.19f1) ; NATS et S3 en cours (1.19f2).

## Entrées et API

- `src/index.ts` : API navigateur (`simulate`, `meshGarment`, `FABRIC_PRESETS`, `toXpbdParams`, types,
  `ENGINE_VERSION`). Aucun `node:*`, pas d'imports de `@atelier/mannequin` ; `test/browser-entry.test.ts` le
  vérifie.
- `src/node.ts` : réservée à Node (`loadAvatarEngine`, `buildAvatar`, `placeGarment`, `drapeGarment`,
  `PlacementError`) ; serveur et tests de drapé seuls l'importent.
- `src/output/` (Node seulement, via `src/node.ts`) : `buildGlb` (GLB déterministe, mètres ici seulement), `cacheKeyOf` et `modelKeyOf` (SHA-256 du JSON canonique), `completedEvent` et `failedEvent` (contenu exact de `drape.completed` et `drape.failed`). Sans E/S ; détail dans la page du composant.
- `src/server.ts` + `src/main.ts` : serveur HTTP (`GET /health`), port `PORT` ou 8000.

## Architecture des dossiers

- `src/core/` : calcul pur et déterministe (ni E/S, ni horloge, pas de `node:*`, `adapters/`, `output/`, `body/`).
  Unités : mm, g, s ; axe Y vers le haut. Types partagés (`types.ts`), validation (`validate.ts`, `InvalidInputError`),
  tissus (`fabric.ts`, `FabricPhysics`, `FABRIC_PRESETS`), topologie et arêtes (`topology.ts`), contraintes XPBD
  (`constraints.ts`), boucle de simulation (`simulate.ts`), collision (`collision.ts`, `body-query.ts`), amortissement
  (`damping.ts`).
- `src/bench/` (ADR 0015) : essais d'atelier hors du cœur déterministe, mêmes règles d'imports. Conversions de
  mesures brutes (`workshop.ts`), tolérances et comparaison (`compare.ts`), test de Cusick simulé (`cusick.ts`,
  `cusick-mesh.ts`, `projected-area.ts`).
- `src/mesh/` : maillage plat d'une pièce de patron (mm, y vers le haut). Pur et déterministe, pas de
  `node:*`/`adapters`. Contour et lattice (`outline.ts`, `lattice.ts`), triangulation Delaunay contrainte
  (`triangulation.ts`, `constrain.ts`, `refine.ts`), maillage d'une pièce (`panel-mesh.ts`), maillage d'un vêtement
  entier (`garment-mesh.ts`), pliures et coutures (`unfold.ts`, `copies.ts`, `seams.ts`).
- `src/body/` : seul à importer `@atelier/mannequin` (exception déclarée au lint). Avatar (1.19e) : cm → mm,
  soudure des sommets UV (`weld.ts`).
- `src/placement/` : pur comme `src/core`. Coupe du corps (`section.ts`), enveloppe convexe (`hull.ts`), niveaux
  autour de l'ancrage (`levels.ts`), placement d'une pièce (`place-garment.ts`), dégagement corps (`clearance.ts`).
- `src/drape/` : orchestration `drapeGarment(job, { maxSteps? }): DrapeOutcome`. Placements, maillage, avatar,
  placement, dégagement, simulation. Résultat : succès avec `DrapeResultCore` et `metrics`, ou échec avec type et
  panelId.

## Invariants et déterminisme

- **Pureté** : `src/core/`, `src/mesh/`, `src/placement/` et `src/bench/` sont purs (règles d'imports du lint).
  `src/body/` est le seul dossier autorisé à importer `@atelier/mannequin`.
- **Déterminisme au bit près** : `Float64Array`, ordre fixe, un seul fil, seulement `+−×÷`, `Math.sqrt`, `abs`,
  `min`, `max`, `floor`. Changer un calcul = changer `ENGINE_VERSION`.
- **Unités et orientation** : longueurs mm, masses g, temps s, Y vers le haut. Seule conversion du moteur :
  cm → mm dans `src/body/weld.ts` ; les mètres du glTF n'apparaîtront que dans `src/output/`.
- **Fonctions chaudes** : elles lisent les tableaux par deux petits utilitaires locaux à chaque module (`f`, `u`) ;
  les importer d'un autre module ralentit d'un facteur 6 sous Vitest.
- **Entrées du réseau** (1.19g) : rien ne tourne sans fin ni n'alloue sans borne ; les refus de taille passent
  avant le travail coûteux (détail dans la page du composant).
- **Fixtures** `test/fixtures/*.json` : copies des références golden du moteur de patronage ; ne pas les modifier
  ici.
- **Interfaces statiques** : `SimulationResult` partagée depuis 1.19d ; `iterations?` entier 1 à `MAX_ITERATIONS` = 32
  (défaut 1). Changer sans signaler = bogue dans les consommateurs.
- **Erreurs** : `InvalidInputError` (sous-classe `RangeError`, `code` 'mesh'|'settings') pour entrées, bornes,
  dégénérescence. `DrapeTooLargeError` pour maillage. `RangeError` du cœur pour calcul.
- **Limites** : `MAX_EDGES_PER_GARMENT` 2 000, `MAX_VERTICES_PER_GARMENT` 30 000, `MAX_PANELS_PER_GARMENT` 40,
  `MAX_SEAMS_PER_GARMENT` 200, `MAX_COORDINATE_MM` 10 000, `MAX_LATTICE_WORK` 5e7.
- **Simulation** : petits pas (1/60 s), 10 sous-pas par défaut, jusqu'à 300–600 pas (borne dure 1 000), arrêt au repos
  (vitesse max sous seuil pendant 10 pas). Réglages par qualité dans `DRAPE_SETTINGS`.
- **Tests de performance** : budgets relatifs (`costRatio` dans `test/helpers.ts`). Référence fixe ~0,55 s, mesurée
  dans le même processus. Borne absolue 60 s.

## Commandes et tests

- Lint : `pnpm nx run @atelier/drape:lint`
- Types : `pnpm nx run @atelier/drape:typecheck`
- Tests : `pnpm nx run @atelier/drape:test` (déterminisme, chute libre, étirement, flexion, collisions, Cusick,
  performance, maillage, avatar, placements, drapé jupe, conversions)
- Build : `pnpm nx run @atelier/drape:build`
- Dev : `pnpm nx run @atelier/drape:dev`

Détail fichier par fichier, formules et choix : `docs/composants/drape.md`.
