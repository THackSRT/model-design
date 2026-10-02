# 0015 — Banc d'essai des tissus : validation des préréglages par un modéliste, rapport téléchargé

**Contexte.** Le moteur de drapé (ADR 0013) simule sept tissus préréglés (`cotton-poplin`, `cotton-wax`, `bazin`,
`linen`, `denim`, `silk-satin`, `jersey`) dont les six propriétés (`FABRIC_PRESETS`, `engines/drape/src/core/fabric.ts`)
sont des **estimations** tirées d'ordres de grandeur de la littérature : grammage, épaisseur, allongements chaîne et
trame sous 10 N sur 50 mm, rigidité de flexion (µN·m), coefficient de frottement. Le résultat d'un drapé le signale
(`fabricEstimated`). L'ADR 0013 demande qu'un modéliste (ou un vendeur de tissus) les valide. Constats (2 octobre 2026) :

- Le contexte Tissus (catalogue, tissu numérique) est un service des phases 3.02 et 3.04 : il n'existe ni service ni
  base pour garder des mesures de tissu.
- Un atelier n'a pas d'appareil Kawabata ni de dynamomètre. Il a une balance de cuisine (0,1 g), un pied à coulisse,
  une règle, des masses connues (une bouteille d'un litre d'eau : 1 kg, soit 9,81 N), une planche qu'on incline et un
  rapporteur ou un téléphone. Certains ont un drapomètre de Cusick.
- Le moteur `@atelier/drape` est du TypeScript sans dépendance (ADR 0013), déjà prévu pour le navigateur ; le studio
  fait tourner `@atelier/mannequin` dans un Web Worker (travail 1.14), et `packages/features` comme `apps/studio`
  peuvent dépendre d'un projet `type:engine` (`eslint.config.mjs`).
- Le studio n'a qu'un écran, sans routage ; `@atelier/viewer3d` sait afficher des maillages quelconques, mais la
  lecture d'un essai de drapé est une vue de dessus (l'ombre portée), plus simple en SVG.

**Décision.**

- **Un écran « Banc d'essai des tissus » dans `apps/studio`**, pour un modéliste. Il passe en revue chaque
  préréglage : valeurs estimées, unités, bornes du contrat `Fabric` ; il saisit des mesures d'atelier ; l'écran
  déduit les grandeurs physiques, les compare à l'estimation (écart relatif et tolérance), simule un essai de drapé
  de Cusick avec les valeurs estimées et avec les valeurs candidates, côte à côte ; le modéliste rend un **verdict**
  par tissu : `validated` (estimation conservée), `corrected` (valeurs à substituer, toutes dans les bornes de
  `Fabric`), `to-review` (à reprendre). Commentaire libre facultatif (500 caractères). L'écran propose un verdict
  (toutes les grandeurs mesurées dans la tolérance : `validated` ; une hors tolérance : `corrected` ; aucune mesure :
  `to-review`) ; le modéliste décide.
- **Pas de persistance serveur en phase 1 : un rapport de validation JSON**, téléchargé depuis le studio et
  ré-importable pour reprendre le travail. Rien n'est gardé dans le navigateur ; l'écran prévient avant de quitter
  une page dont les modifications ne sont pas exportées. Un développeur applique le rapport à `FABRIC_PRESETS`
  (nouvelle `ENGINE_VERSION`, puisque le calcul change) ; une tâche suivante (1.39e) ajoute au moteur l'état
  « validé » d'un préréglage, pour que `fabricEstimated` soit faux quand le tissu ne vient que de valeurs validées.
- **Contrat** (`contracts/schemas/drape/`, nouveaux schémas, aucun changement des schémas existants) :
  - `fabric-physics.schema.json` (`FabricPhysics`) : les six propriétés, toutes requises ; chacune référence
    (`$ref`) la propriété de `fabric.schema.json`, donc mêmes unités, mêmes bornes, même description. Même nom et
    même forme que le type `FabricPhysics` du moteur.
  - `fabric-bench-measurements.schema.json` (`FabricBenchMeasurements`) : mesures **brutes**, telles que lues sur les
    instruments, chaque essai facultatif : `weighing` (`FabricWeighing`), `thickness` (`FabricThicknessTest`),
    `stretchWarp`, `stretchWeft` (`StripStretchTest`), `bendingWarp`, `bendingWeft` (`CantileverBendingTest`),
    `friction` (`InclinedPlaneFrictionTest`), `drape` (`MeasuredDrape`). Les séries de lectures sont des tableaux
    bornés (1 à 32 valeurs).
  - `fabric-derived-values.schema.json` (`FabricDerivedValues`) : grandeurs déduites, informatives, bornées à 0 en
    bas seulement (une mesure hors des bornes de `Fabric` reste visible et signalée).
  - `fabric-preset-review.schema.json` (`FabricPresetReview`) : `preset` (`$ref` vers l'énumération de `Fabric`),
    `verdict`, `reviewedAt`, `estimated` (valeurs revues), `measurements`, `derived`, `corrected` (présent si et
    seulement si `verdict` vaut `corrected` : `if`/`then`/`else`), `simulatedDrape` (`estimated`, `candidate` :
    `CusickSimulation` avec les propriétés simulées, `drapeCoefficient`, `converged`, `simulatedSteps`), `comment`.
  - `fabric-validation-report.schema.json` (`FabricValidationReport`) : `schemaVersion` (`1.0`), `createdAt`,
    `updatedAt` (UTC, motif `Z$`), `engineVersion` (version de `@atelier/drape` dont viennent les estimations et les
    essais simulés), `reviews` (1 à 32, un par préréglage, unicité vérifiée à l'import).
  - Les mesures brutes font foi : `derived` est recalculé à chaque import. Les essais simulés d'un rapport produit
    par une autre `engineVersion` sont écartés à l'import (à relancer) ; une revue dont `estimated` ne correspond
    plus au préréglage courant repasse à `to-review`, mesures et commentaire gardés, avec un avis à l'écran.
- **Essais d'atelier et formules** (fonctions pures et testées du moteur, `engines/drape/src/bench/`) ; pesanteur
  g = 9,81 m/s², comme le moteur (`GRAVITY_MM_PER_S2` = 9 810) :
  - **Pesée** d'un échantillon découpé : grammage `weightGPerM2` = `sampleMassG` / `sampleAreaMm2` × 10⁶. Conseil à
    l'écran : au moins 0,1 m² (250 × 400 mm) avec une balance au 0,1 g, ou 100 cm² avec une balance au 0,01 g.
  - **Épaisseur** au pied à coulisse ou au micromètre : `thicknessMm` = moyenne des `readingsMm`.
  - **Allongement d'une bande** suspendue (50 mm de large recommandés, repères à 200 mm) sous une masse `hangingMassG`
    pince comprise : allongement mesuré ε = (`loadedLengthMm` − `gaugeLengthMm`) / `gaugeLengthMm` × 100 ; tension
    par unité de largeur T = `hangingMassG` × 9,81 × 10⁻³ / `stripWidthMm` (N/mm) ; ramené à la tension de référence
    de `Fabric`, T₀ = 10 N / 50 mm = 0,2 N/mm, par **hypothèse linéaire** : `stretchPercent` = ε × T₀ / T. C'est le
    modèle du moteur (raideur constante, `toXpbdParams`). Hors de 0,5 ≤ T / T₀ ≤ 2, l'écran signale une
    extrapolation ; une masse de 1 kg sur 50 mm (T / T₀ = 0,98) l'évite. Le schéma ne peut pas comparer deux
    champs : une saisie où `loadedLengthMm` < `gaugeLengthMm` donnerait un allongement négatif, que
    `FabricDerivedValues` refuse (minimum 0), et un rapport exporté ne se réimporterait plus. Une telle mesure est
    donc refusée et signalée (code `loaded-shorter`) : aucune valeur n'en est déduite, et elle n'entre jamais dans
    les `measurements` d'un rapport. Le moteur lève une `RangeError` (1.39b), le modèle de vue la traite comme une
    erreur de saisie (1.39c).
  - **Longueur de flexion au porte-à-faux** (ASTM D1388 option A, ISO 9073-7 : bande de 25 × 200 mm, plan incliné à
    41,5°) : c = moyenne des `overhangLengthsMm` / 2 (mm) ; rigidité de flexion par unité de largeur B = W × c³ avec
    W = grammage × g, soit `bendingRigidityMicroNm` = `weightGPerM2` × c³ × 9,81 × 10⁻⁶ (c en mm). C'est la longueur
    (B/W)^⅓ déjà vérifiée par le test de porte-à-faux du moteur (ADR 0013). Le grammage est celui de la pesée, ou à
    défaut celui du préréglage (`bendingWeightSource` : `measured` ou `estimated`). Chaîne et trame se mesurent à
    part ; la flexion du moteur est isotrope : B retenu = √(B_chaîne × B_trame), ou le seul sens mesuré.
  - **Frottement au plan incliné** : un patin lesté recouvert du tissu glisse sur une planche recouverte de la surface
    d'appui (`counterSurface` : housse de buste, peau synthétique, le tissu lui-même, autre) ; `frictionCoefficient`
    = moyenne des tan θ des `slideAnglesDeg`.
  - **Valeurs candidates** : l'estimation où chaque grandeur mesurée, si elle est dans les bornes de `Fabric`,
    remplace la valeur estimée ; une grandeur hors bornes garde l'estimation et est signalée. Le verdict `corrected`
    préremplit `corrected` avec les valeurs candidates, que le modéliste peut ajuster dans les bornes.

**Tolérances.** Une mesure m est conforme à l'estimation e si |m − e| ≤ max(r × e, a) ; l'écart affiché est
(m − e) / e. Ce sont des constantes du moteur (`BENCH_TOLERANCES`, `DRAPE_COEFFICIENT_TOLERANCE`), affichées à
l'écran ; elles se revoient par une nouvelle ADR après les premiers rapports.

| Grandeur                                    | r    | a       | Justification                                                                                                                       |
| ------------------------------------------- | ---- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Grammage                                    | 10 % | 0       | Tolérance commerciale courante de ± 5 %, plus la découpe et la pesée.                                                               |
| Épaisseur                                   | 25 % | 0,05 mm | Pression du pied à coulisse non maîtrisée (ISO 5084 : 1 kPa) ; l'épaisseur ne sert qu'à la distance de contact.                     |
| Allongements chaîne et trame                | 30 % | 1 point | Règle au mm sur 200 mm : 0,5 point par lecture, deux lectures ; hypothèse linéaire ; anisotropie approchée par le moteur (10–25 %). |
| Rigidité de flexion                         | 35 % | 0       | B varie comme c³ : 10 % d'erreur sur le porte-à-faux donnent 33 % ; le test de porte-à-faux du moteur tient à 25 %. Voir plus bas.  |
| Coefficient de frottement                   | 25 % | 0,10    | Frottement statique mesuré, coefficient unique de Coulomb dans le moteur ; surface d'appui approchée ; angle lu à 1–2° près.        |
| Coefficient de drapé (mesuré contre simulé) | —    | 0,05    | Répétabilité de l'essai de Cusick de l'ordre de 0,02 à 0,03 ; maillage de 7,5 mm de la simulation.                                  |

La rigidité de flexion est aussi proportionnelle au grammage (B = grammage × g × c³). Avec un grammage estimé
(`bendingWeightSource` : `estimated`, faute de pesée), l'erreur du grammage s'ajoute à celle du porte-à-faux, et
l'erreur totale peut dépasser les 35 % de tolérance. L'écran signale alors que la rigidité repose sur un grammage
estimé et conseille la pesée. La source du grammage est écrite dans le rapport (`derived.bendingWeightSource`).

**Décision (suite).**

- **Essai de drapé de Cusick simulé** (BS 5058, ISO 9073-9) avec `simulate` de `@atelier/drape`, sans changer le
  cœur : éprouvette circulaire de 300 mm de diamètre, maillage en anneaux concentriques (anneau k : 6k sommets à
  k × h du centre ; arête h de 5, 7,5, 10 ou 15 mm, 7,5 mm par défaut, soit 1 261 sommets), droit fil selon x ;
  sommets à 90 mm du centre au plus fixés (serrés entre les deux disques de 180 mm) ; disque support comme corps
  (cylindre fermé de 90 mm de rayon et 20 mm de haut, dessus à y = 0) ; éprouvette posée à plat à y = épaisseur +
  2 mm, sommets libres décalés verticalement d'au plus 0,5 mm par une fonction entière de leur indice (rupture de
  symétrie, sans hasard) ; pas de 1/60 s, 20 sous-pas, 300 pas au plus (5 s), arrêt au repos (1 mm/s). Aire
  projetée de l'éprouvette sur le plan horizontal (x, z) par pixellisation en cellules de 1 mm (centre de cellule
  dans un triangle projeté) ; coefficient de drapé DC = (aire projetée − aire du disque) / (aire à plat du maillage
  − aire du disque), borné à [0, 1], arrondi à 0,001. Contour de l'ombre pour l'affichage : rayon maximal des
  sommets projetés par secteur angulaire (120 secteurs de 3° par défaut). L'essai simulé avec les valeurs estimées et celui avec les valeurs candidates
  sont affichés côte à côte (vue de dessus en SVG : disque, éprouvette à plat, ombre) ; un DC mesuré au drapomètre
  (éprouvette de 300 mm, disque de 180 mm seulement) se compare aux deux.
- **Code** : `engines/drape/src/bench/` (essais d'atelier, tolérances, écarts, valeurs candidates, essai de Cusick),
  pur comme `src/core/` (ni `node:*`, ni adaptateurs, ni sorties : règle de lint étendue) mais hors du cœur
  déterministe : `Math.sin`, `Math.cos`, `Math.tan`, `Math.atan2` y sont permis pour construire l'éprouvette, le
  disque et le contour, et pour convertir les angles. Même entrée, même résultat au bit près sur un même moteur
  JavaScript ; d'un navigateur à l'autre, un écart d'un ulp sur les coordonnées initiales reste invisible au
  millième du DC. Les entrées des fonctions sont les types du contrat (`@atelier/contracts-ts`, importés en type
  seulement, dépendance de l'espace de travail). `@atelier/drape` gagne la condition d'export `source` (comme
  `@atelier/mannequin`) pour être lu depuis ses sources par Vite et Vitest. `packages/features` (modèle de vue
  `useFabricBench`, port `CusickRunner`, import et export du rapport) et `apps/studio` (onglets, écran, Worker de
  l'essai de Cusick sur le modèle de `mannequin.worker.ts`) dépendent de `@atelier/drape`.
- **Import d'un rapport, fichier non fiable** : 256 Kio au plus, `JSON.parse`, puis validation stricte contre les
  schémas du contrat par un validateur minimal du sous-ensemble de JSON Schema qu'ils utilisent (`type`, `enum`,
  `const`, bornes, longueurs, `pattern`, `format: date-time`, `required`, `additionalProperties: false`, `$ref`
  entre fichiers de `jsonSchemas`, `if`/`then`/`else`, schéma booléen), écrit dans `packages/features` ; un mot-clé
  inconnu fait échouer un test. Écartés : Ajv dans le navigateur (génère du code par `new Function`, incompatible
  avec une politique de sécurité de contenu stricte, et alourdit le paquet), Ajv précompilé (change le générateur
  des contrats, à reconsidérer si d'autres imports de fichiers apparaissent). Le commentaire est affiché comme
  texte, jamais comme HTML. Son `maxLength` (500) compte en points de code, comme le veut JSON Schema, et non en
  unités UTF-16 (`String.length`, qui compte deux unités pour un emoji). Les validateurs du studio (saisie dans
  1.39c, import dans 1.39g) comptent en points de code (`[...texte].length`).
- **Navigation** : le studio gagne deux onglets de premier niveau, « Patron » et « Tissus », sans bibliothèque de
  routage : état local, reflété dans l'ancre de l'URL (`#tissus`) pour survivre au rechargement. L'onglet Tissus est
  chargé à la demande (`React.lazy`) : le paquet initial ne grossit pas.
- **Hors périmètre** : persistance serveur et partage de rapports (service Tissus, phases 3.02 et 3.04) ; ajout d'un
  préréglage (changement de l'énumération de `Fabric`) ; propriétés que le moteur ne modélise pas (cisaillement,
  flexion anisotrope, allongement non linéaire, hystérésis, frottement dynamique) ; nombre de plis de l'essai de
  Cusick ; mesure du drapé par photographie ; application automatique du rapport au code ; fusion de rapports de
  plusieurs modélistes ; éprouvettes de Cusick de 240 et 360 mm (ajout compatible à l'énumération plus tard).

**Conséquences.** Un modéliste valide ou corrige les sept préréglages avec un matériel d'atelier, sans compte ni
serveur, et le rapport garde les lectures brutes : on peut refaire le calcul ou en contester un. Le coût : sept
fonctions de conversion, l'essai de Cusick et un validateur d'import à écrire et à tester, un deuxième Web Worker et
un écran dans le studio (huit tâches, 1.39b à 1.39i). Limites assumées : les essais d'atelier sont moins précis que
les essais normalisés (d'où des tolérances larges), l'allongement est ramené à 10 N par une hypothèse linéaire,
fausse pour un jersey sous forte charge, la rigidité de flexion dépend du grammage (estimé faute de pesée), le
porte-à-faux est peu fiable sur un tissu qui roulotte (jersey), le frottement mesuré est statique et sur une
surface qui n'est pas la peau. Un rapport appliqué change le calcul du drapé : nouvelle `ENGINE_VERSION`, donc
nouvelles empreintes de cache. Le rapport ne contient aucune donnée personnelle ; seul le commentaire libre pourrait
en recevoir : l'écran le rappelle, le schéma le borne, et le fichier ne quitte le poste que si le modéliste l'envoie.
À revoir quand le service Tissus existera (les mesures y deviendront des propriétés d'un `FabricArticle`), ou si un
laboratoire fournit des mesures Kawabata ou FAST des sept tissus.

**Décisions de l'orchestrateur, sur délégation de l'utilisateur (02/10/2026).** L'« interface de validation des
tissus » est l'écran « Banc d'essai des tissus » du studio, pour un modéliste, avec les trois verdicts `validated`,
`corrected`, `to-review`, un commentaire facultatif, sans nom de personne ni donnée personnelle, dates en UTC. Pas de
persistance serveur en phase 1 : un rapport JSON conforme au contrat, téléchargé et ré-importable ; un développeur
l'applique à `FABRIC_PRESETS`, et l'état « validé » d'un préréglage vient au moteur dans une tâche suivante. Essais
d'atelier simples et facultatifs (pesée, épaisseur, allongement d'une bande de 50 mm ramené à 10 N par hypothèse
linéaire, porte-à-faux à 41,5°, plan incliné), convertis par des fonctions pures et testées, comparés à
l'estimation avec une tolérance. Contrôle visuel par un essai de drapé de Cusick simulé (300 mm sur 180 mm) avec
les valeurs estimées et mesurées, dans un Web Worker du studio ; l'aide de construction de l'essai vit dans
`engines/drape`, exportée par `@atelier/drape`. Navigation par deux onglets (Patron | Tissus), sans dépendance de
routage. Précisions de l'architecte : les essais simulés utilisent les valeurs **candidates** (mesures dans les
bornes, sinon estimation), toujours simulables ; l'import est validé sans Ajv ; le travail est découpé en huit
tâches (1.39b à 1.39i) au lieu de quatre, pour tenir dans des demandes de fusion d'environ 400 lignes.
