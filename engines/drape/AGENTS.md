# Moteur drape (TypeScript)

Rôle : faire tomber les pièces cousues d'un vêtement sur l'avatar (dynamique à base de positions étendue, XPBD, sur
CPU, sans aucune dépendance). Décision : ADR 0013 (exception à l'ADR 0003 : moteur TypeScript, comme le mannequin).
Aujourd'hui : le socle du paquet `@atelier/drape` et le cœur de simulation (tâche 1.19b) ; maillage des pièces,
avatar, glTF et tâche NATS suivent (1.19d, 1.19e).

- `src/index.ts` : API (`simulate`, `FABRIC_PRESETS`, `toXpbdParams`, types, `ENGINE_VERSION`) ;
  `src/server.ts` + `src/main.ts` : `GET /health` (`{ name: "drape", version }`), `node:http`, port `PORT` ou 8000.
- `src/core/` : cœur pur et déterministe (ni E/S, ni horloge, ni hasard ; mm, g, s ; axe Y vers le haut). Le lint
  (`eslint.config.mjs`) interdit à `src/core/` d'importer `node:*`, `adapters/`, `output/`, `body/`. À venir hors du
  cœur : `src/body/` (avatar par `@atelier/mannequin`, cm → mm ici seulement), `src/output/` (glTF, mètres ici
  seulement), `src/adapters/` (NATS, stockage).
  - `types.ts` : `ClothMesh`, `BodyMesh`, `FabricPhysics`, `SimulationSettings`, `SimulationResult` (interface
    partagée avec 1.19d : ne pas la changer sans le signaler ; `iterations?` est un ajout facultatif : entier de 1 à `MAX_ITERATIONS` = 32, 1 par défaut) ;
  - `validate.ts` : validation des entrées avant toute simulation ; `InvalidInputError` (sous-classe de
    `RangeError`, `code` `'mesh'` ou `'settings'`) pour indices de triangles (tissu, corps), coutures et sommets
    fixes hors bornes, non entiers ou triangle dégénéré, `iterations` hors bornes ;
  - `fabric.ts` : préréglages (valeurs ESTIMÉES, à faire valider) et conversion des unités physiques vers les
    raideurs XPBD (`toXpbdParams`, formules commentées) ; statut des préréglages (`FABRIC_PRESET_STATUS`,
    `'estimated'` | `'validated'`, tous estimés aujourd'hui), `resolveFabric` (tissu du contrat → `FabricPhysics`,
    la surcharge l'emporte) et `isFabricEstimated` (base de `DrapeResult.fabricEstimated`, tâche 1.19e : vrai si
    préréglage estimé et au moins une des six propriétés non surchargée) ;
  - `topology.ts` : masses, arêtes d'étirement (raideur `k = K(θ)·A/l²`, interpolée entre chaîne et trame par
    cos² de l'angle au droit fil), stencils de flexion isométrique (Bergou 2006, `k = D/(A0+A1)`) ;
  - `constraints.ts` : passes de Gauss-Seidel (étirement, flexion, coutures) avec multiplicateurs de Lagrange λ remis à zéro
    à chaque sous-pas et cumulés sur ses itérations (XPBD, terme `α̃·λ`) ; `simulate.ts` : boucle (petits pas,
    phase de couture à gravité réduite, arrêt au repos : vitesse max sous le seuil pendant 10 pas) ;
  - `body-grid.ts`, `body-query.ts`, `triangle-distance.ts`, `collision.ts` : collision sommet-triangle contre un
    corps fermé (normales vers l'extérieur par l'ordre des sommets), grille de hachage spatiale, frottement de
    Coulomb positionnel ; `damping.ts` : amortissement des modes non rigides.
- `src/bench/` (ADR 0015, tâche 1.39b) : essais d'atelier, fonctions pures hors du cœur déterministe (`Math.tan`,
  `sin`, `cos`, `atan2` permis ; même règle d'imports que `src/core`, `node:*` interdit). `workshop.ts` : conversions
  des mesures brutes (`FabricBenchMeasurements`) en grandeurs (`deriveFabricValues`, `stripStretch`, `bendingLengthMm`,
  `bendingRigidityMicroNm`, `frictionFromSlideAngles`, g = 9,81 m/s²) ; `compare.ts` : tolérances (`BENCH_TOLERANCES`),
  écarts (`compareToEstimate`), valeurs candidates (`candidateFabric`). Entrée invalide : `RangeError` (le
  consommateur valide avant d'appeler). Dépend de `@atelier/contracts-ts` (types seulement) ; condition d'export
  `source` pour Vitest/Vite.
  Tolérances incluses malgré la virgule flottante : `TOLERANCE_EPSILON` = 1e-9 (`compare.ts`).
  Essai de drapé de Cusick simulé (tâche 1.39f) : `cusick-mesh.ts` (`buildCusickTest` : éprouvette de 300 mm en
  anneaux, arête 5 / 7,5 / 10 / 15 mm, sommets à r ≤ 90 mm fixes, départ à plat au-dessus d'un disque de 180 mm
  avec une perturbation déterministe en y ; 300 pas, 20 sous-pas), `projected-area.ts` (aire de l'ombre par carte
  binaire de cellules de 1 mm, plis comptés une fois), `cusick.ts` (`drapeCoefficient`, `shadowOutlineMm`,
  `runCusickTest`). DC = (ombre − disque) / (éprouvette − disque), borné à [0, 1], au millième ; l'aire de
  l'éprouvette est celle du maillage (polygone : 99,8 % du disque à 15 mm, plus de 99,9 % à 10 mm et moins).
  Mesures (poste de développement, charge variable) : 7,5 mm, 0,75 à 2 s (silk-satin 0,305, cotton-poplin 0,396,
  denim 0,739 non convergé en 300 pas) ; 10 mm, 0,2 à 1,9 s.
- Appliquer un rapport de validation des tissus (ADR 0015) : pour chaque revue `corrected`, remplacer les valeurs
  de `FABRIC_PRESETS` par celles de `corrected` ; mettre `'validated'` dans `FABRIC_PRESET_STATUS` pour les verdicts
  `validated` et `corrected` ; `to-review` ne change rien ; monter `ENGINE_VERSION` (mineure) ; ajouter une ligne
  au `CHANGELOG.md` ; garder le rapport appliqué hors du dépôt s'il contient un commentaire libre (aucune donnée
  personnelle dans le dépôt). Mettre à jour le test « aucun préréglage validé » de `test/fabric-status.test.ts`.
- Déterminisme au bit près : `Float64Array`, ordre fixe, un seul fil, seulement `+ − × ÷`, `Math.sqrt`, `abs`, `min`,
  `max` (et `Math.floor` pour la grille) ; ni `sin`, `cos`, `exp`, `pow` dans le cœur. Changer un calcul : changer
  `ENGINE_VERSION`.
- Les fonctions chaudes lisent les tableaux par deux petits utilitaires locaux à chaque module (`f`, `u`) : les
  importer d'un autre module ralentit d'un facteur 6 sous Vitest (accès indirect aux imports).
- Limites connues : une itération par sous-pas par défaut (« petits pas ») sous-estime la raideur des chaînes très raides ou
  très longues (régler `substeps` / `iterations?`) ; l'anisotropie chaîne/trame est interpolée par arête, donc
  approchée (écart mesuré : environ 10 % pour un rapport 1,25 entre les deux sens, 25 % pour un rapport 2) ; pas
  d'auto-collision du vêtement ; la capture des collisions est limitée à 8 mm au-delà de la distance de contact
  (pas de traversée tant que la vitesse reste sous environ 4 m/s).
- Tests (`test/`, Vitest) : déterminisme, chute libre, bande suspendue (étirement), porte-à-faux (flexion, solution
  exacte de l'élastique pesant dans `elastica.ts`), sphère, plan incliné, coutures, performance (70 × 70 sommets en
  moins de 10 s), conversions, `/health`.
- Commandes : `pnpm nx run @atelier/drape:lint`, `…:typecheck`, `…:test`, `…:build`, `…:dev`.
- Modèle à suivre : `engines/mannequin`.
