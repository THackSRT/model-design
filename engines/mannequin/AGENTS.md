# Moteur mannequin (TypeScript)

Rôle : mesures du contrat (mm) → corps MakeHuman (CC0) ajusté à 6 mm près, visage sans traits, bras abaissés.
Tourne à l'identique dans le navigateur et dans Node.

- `src/index.ts` : API typée (`loadMannequinEngine`, `fit`) ; conversion mm → cm ici seulement. `fit` renvoie
  aussi `landmarksMm` (hauteurs depuis le sol, en mm, mesurées sur le maillage : `crotch`, `hip`, `waist`,
  `neck`, `knee`, `ankle` ; absent = erreur). `body` est toujours fait de tableaux neufs, propriété de l'appelant
  (transférables à un Worker ; rien du modèle en cache n'est partagé). Si `crotchHeightMm` est fourni, l'entrejambe est ajusté (paire `upperleg`,
  bornée à ±1 : plage atteignable d'environ 740 à 835 mm pour 1700 mm de stature, précision < 1 mm dedans).
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
  `test/landmarks.test.ts` (entrejambe et repères de hauteur).
- Commandes : `pnpm nx run @atelier/mannequin:test|lint|typecheck|build`.
