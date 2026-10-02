# Moteur mannequin (TypeScript)

Rôle : mesures du contrat (mm) → corps MakeHuman (CC0) ajusté à 6 mm près, visage sans traits, bras abaissés.
Tourne à l'identique dans le navigateur et dans Node.

- `src/index.ts` : API typée (`loadMannequinEngine`, `fit`) ; conversion mm → cm ici seulement. `fit` renvoie
  aussi `landmarksMm` (hauteurs depuis le sol, en mm, mesurées sur le maillage : `crotch`, `hip`, `waist`,
  `neck`, `knee`, `ankle`, `shoulder`, `wrist` ; absent = erreur). `body` est toujours fait de tableaux neufs, propriété de l'appelant
  (transférables à un Worker ; rien du modèle en cache n'est partagé). Si `crotchHeightMm` est fourni, l'entrejambe est ajusté (paire `upperleg`,
  bornée à ±1 : plage atteignable d'environ 740 à 835 mm pour 1700 mm de stature, précision < 1 mm dedans).
  `fit` renvoie aussi `armsMm` (tâche 1.35) : pour `left` (x > 0) et `right`, `shoulder` (pivot de l'épaule,
  articulation `upperarm01`), `wrist` (centre de l'articulation `wrist`, après rotation de la pose), `axis`
  (unitaire épaule vers poignet) et `lengthMm`, en mm, repère du corps (y depuis le sol, z vers l'avant). Le pivot
  est plus bas que l'acromion : longueur épaule-poignet d'environ 0,26 de la stature. `landmarksMm.shoulder` =
  hauteur du pivot, `landmarksMm.wrist` = hauteur moyenne des poignets. Les bras posés (9°) restent proches du
  torse : une coupe horizontale peut les confondre avec lui, utiliser ces axes plutôt qu'une coupe.
- `src/core/makehuman.ts` : façade `createMakeHuman` (API : `load`, `fit`, `measure`, `pose`, `renderGeometry`,
  `baseTriangles`, `ringPoints`, `FIT_KEYS`). Reprise du prototype (ADR 0004), découpée en modules purs de
  moins de 300 lignes ; toute modification passe par une relecture humaine.
  - `types.ts` : types partagés (mesures, morphologie, modèle, anneaux) ;
  - `mhz-data.ts` : gzip et lecture du binaire (`gunzip`, `parse`) ;
  - `morph.ts` : cibles, macros (sexe, âge, musculature, corpulence, origine), paires de mensuration ;
  - `regions.ts` : zones de mesure (sommets et bande du mètre ruban), triangles en sommets de base ;
  - `geometry.ts` : vecteurs, enveloppe convexe (`hullPerimeter`), axe principal (`axisOf`), `bounds` ;
  - `measure.ts` : tour au mètre ruban (`circumference`), entrejambe, `measure`, points d'anneau ;
  - `fit-macro.ts` / `fit.ts` : ajustement (corpulence et musculature, puis sécante par mensuration et par
    entrejambe, échelle) ;
  - `pose.ts` : bras abaissés ; `render.ts` : géométrie de rendu (normales lissées, sommets aux coutures UV).
- `src/core/plain-face.ts` : visage sans traits et aplati (yeux, sourcils, nez, bouche effacés, crâne gardé) ;
  `src/core/thin-plate.ts` : spline de plaque mince qui porte la surface de remplacement.
- `assets/makehuman.mhz` : données gzip, construites par `tools/build_makehuman.py` depuis le dépôt MakeHuman.
- Tests : `test/mannequin.test.ts` (précision de l'ajustement, données déjà décompressées, maillage) ;
  `test/characterization.test.ts` (sortie figée sur trois jeux de mesures fictifs : garde-fou de tout
  changement de calcul ; ne l'actualiser que si le changement est voulu, avec `ENGINE_VERSION`/relecture) ;
  un test par module de `src/core` (`geometry`, `morph`, `mhz-data`, `regions`, `measure`, `render-pose`) ;
  `test/landmarks.test.ts` (entrejambe et repères de hauteur) ; `test/arms.test.ts` (épaules, poignets, axes des bras).
- `src/garment/` : habillage rapide (`dressMannequin(fitted, spec, { type }, { rings?, segments? })`, tâche
  1.34a). Approximation géométrique, sans simulation physique (le drapé est 1.19), par anneaux horizontaux comme
  le prototype. Rend `GarmentMesh` (positions et normales en cm, index, `tightZones` en mm depuis le sol ; tableaux
  neufs). Pur et déterministe, environ 40 ms par vêtement. Modules :
  - `pattern.ts` : lit le patron (mm) ; tour fini à une hauteur = somme des largeurs des pièces (× 2 si pli, ×
    quantité) ; les pinces sont des échancrures du contour, déjà retirées ; jupe cercle lue en arcs ;
  - `section.ts` : coupe du corps à une hauteur, en composantes connexes (tronc, jambes, bras) ;
  - `ring.ts` : anneau = enveloppe convexe + disque de rayon d (jamais dans le corps) au tour fini ; sinon collé au
    corps, avec l'écart rendu (zone « trop juste », seuil 1 mm) ;
  - `plans.ts` : correspondance patron/corps par type (taille ↔ `waist`, entrejambe ↔ `crotch`, haut du dos du
    corsage ↔ `neck`) ; un tube par jupe ou corsage, tronc + une jambe par côté pour le pantalon ;
  - `mesh.ts` : anneaux → triangles et normales ; `dress.ts` : orchestration et zones.
  - Limites : manches non habillées ; ceinture de la jupe cercle ignorée ; au-dessus de l'aisselle du corsage le tour
    n'est pas comparable (emmanchures, encolure) : jamais signalé trop juste ; pince de poitrine : tour lu au
    maximum sur ±30 mm.
  - Tests : `test/garment-units.test.ts`, `test/garment-dress.test.ts` (patrons dans `test/fixtures`, copies des
    références du patronage, mesures fictives).
- Commandes : `pnpm nx run @atelier/mannequin:test|lint|typecheck|build`.
