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
    partagée avec 1.19d : ne pas la changer sans le signaler ; `iterations?` est un ajout facultatif) ;
  - `fabric.ts` : préréglages (valeurs ESTIMÉES, à faire valider) et conversion des unités physiques vers les
    raideurs XPBD (`toXpbdParams`, formules commentées) ;
  - `topology.ts` : masses, arêtes d'étirement (raideur `k = K(θ)·A/l²`, interpolée entre chaîne et trame par
    cos² de l'angle au droit fil), stencils de flexion isométrique (Bergou 2006, `k = D/(A0+A1)`) ;
  - `constraints.ts` : passes de Gauss-Seidel (étirement, flexion, coutures) ; `simulate.ts` : boucle (petits pas,
    phase de couture à gravité réduite, arrêt au repos : vitesse max sous le seuil pendant 10 pas) ;
  - `body-grid.ts`, `body-query.ts`, `triangle-distance.ts`, `collision.ts` : collision sommet-triangle contre un
    corps fermé (normales vers l'extérieur par l'ordre des sommets), grille de hachage spatiale, frottement de
    Coulomb positionnel ; `damping.ts` : amortissement des modes non rigides.
- Déterminisme au bit près : `Float64Array`, ordre fixe, un seul fil, seulement `+ − × ÷`, `Math.sqrt`, `abs`, `min`,
  `max` (et `Math.floor` pour la grille) ; ni `sin`, `cos`, `exp`, `pow` dans le cœur. Changer un calcul : changer
  `ENGINE_VERSION`.
- Les fonctions chaudes lisent les tableaux par deux petits utilitaires locaux à chaque module (`f`, `u`) : les
  importer d'un autre module ralentit d'un facteur 6 sous Vitest (accès indirect aux imports).
- Limites connues : une itération par sous-pas (« petits pas ») sous-estime la raideur des chaînes très raides ou
  très longues (régler `substeps` / `iterations?`) ; l'anisotropie chaîne/trame est interpolée par arête, donc
  approchée (écart mesuré : environ 10 % pour un rapport 1,25 entre les deux sens, 25 % pour un rapport 2) ; pas
  d'auto-collision du vêtement ; la capture des collisions est limitée à 8 mm au-delà de la distance de contact
  (pas de traversée tant que la vitesse reste sous environ 4 m/s).
- Tests (`test/`, Vitest) : déterminisme, chute libre, bande suspendue (étirement), porte-à-faux (flexion, solution
  exacte de l'élastique pesant dans `elastica.ts`), sphère, plan incliné, coutures, performance (70 × 70 sommets en
  moins de 10 s), conversions, `/health`.
- Commandes : `pnpm nx run @atelier/drape:lint`, `…:typecheck`, `…:test`, `…:build`, `…:dev`.
- Modèle à suivre : `engines/mannequin`.
