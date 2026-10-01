# Moteur patterning (moteur de référence)

Rôle : mesures + paramètres → spécification de patron (`GarmentSpec`, mm). Sans état, déterministe.
Contrat : `contracts/openapi/patterning.yaml`. Temps visé : moins de 100 ms par tracé (budget de test : 1 s).

- `core/` : calcul pur : `body.py` (mesures complétées, rapports d'estimation), `curves.py` (tangentes, arcs, découpe
  à une longueur), `checks.py` (contours, coutures avec embu, crans ; une violation = `PatternCheckError`, bogue),
  `drafting.py` (type de vêtement → tracé, contrôle de chaque sortie ; type sans tracé = 422
  `garment-type-not-supported`), `errors.py`, `garments/` (un module par vêtement ; `parts.py` pour les outils
  communs : points arrondis, pièce en miroir, crans ; `darts.py` pour les briques partagées par jupes, pantalon
  et corsage : demi-pièces `Half`, pinces, bords de taille ou de bas). Interdit d'y importer FastAPI, Pydantic ou les contrats
  (vérifié par `.importlinter`).
- Tracés disponibles (version 0.4.0) : `straight-skirt` (`garments/straight_skirt.py`), `circle-skirt`
  (`garments/circle_skirt.py`), `trousers` (`garments/trousers.py`), `bodice` (`garments/bodice.py`,
  `garments/sleeve.py`).
- Les tracés sont réécrits depuis GarmentCode (MIT, commit `d449629`, ADR 0010) : chaque module cite son fichier
  d'origine dans sa docstring ; la licence est reproduite dans `THIRD_PARTY_NOTICES.md` (copié dans l'image).
- Jupe droite : devant au pli (`front`), dos en deux pièces (`back-right`, `back-left`, couture `center-back`) ;
  une pince par demi-devant, deux par demi-dos, toujours présentes (largeur minimale de 2 mm, le côté absorbe la différence : même topologie à toutes les tailles, pour la gradation).
  Les côtés (pente, profondeur) sont communs au devant et au dos, donc cousus à la même longueur ; la rallonge de
  5 % du dos de GarmentCode est écartée. Crans : ligne des hanches sur `side-upper`, milieu devant et milieu dos
  à la taille. Les largeurs de dos (0,47 de la taille, 0,535 des hanches) viennent des corps moyens : le dos porte
  l'essentiel des pinces, à valider par le modéliste.
- Jupe cercle : `front` et `back` valent chacun la moitié de `circleFraction` ; arcs en cubiques de 45° au plus
  (`hem-n`, `waist-n`) ; `lengthMm` est la longueur radiale ; la ceinture facultative (`waistband-front`,
  `waistband-back`) s'ajoute au-dessus de la taille et son bas est coupé en autant de bords que l'arc de taille.
- Pantalon : quatre pièces (`front-left`, `front-right`, `back-left`, `back-right`, symétriques en x), une pince
  devant, deux au dos ; bords `hem`, `side-lower|middle|upper`, `waist-n`, `rise` (montant), `crotch` (courbe
  d'entrejambe), `inseam-upper|lower`, genou à mi-hauteur sous l'entrejambe. Côtés et entrejambe (courbe et
  jambe) sont cousus à la même longueur par construction (GarmentCode laisse 23 mm) : même rétrécissement de
  jambe devant et dos, courbes de même longueur (la fourche du dos est plus basse). Le prolongement d'entrejambe
  (cuisse + 60 mm - hanches/2 avec aisance, au moins 20 mm) est réparti un quart devant. Sans `hemGirthMm`,
  jambe droite depuis le genou (tour de genou + 60 mm). Mesure d'entrejambe : `crotchHeightMm` obligatoire ;
  tour de cuisse et de genou estimés (rapport au tour de hanches, ANSUR II : `core/body.py`) et listés.
  Erreurs 422 propres : `measurement-required`, `trousers-shorter-than-crotch`, `trousers-hem-too-narrow` ;
  entrejambe au-dessus des hanches ou cuisse incompatible : `inconsistent-measurements`.
- Corsage (`bodice`) : devant au pli (`front`), dos en deux pièces (`back-right`, `back-left`, couture `center-back`),
  manche facultative (`sleeve`, une pièce à couper deux fois). Repères : taille à y = 0, épaule vers y > 0, bas à
  \-`lengthBelowWaistMm` ; bords du bas `hem-n` (rôle `hem`), côtés `side-below|lower|upper`, `armhole`, `shoulder`,
  `neck` (rôle `opening`, ainsi que l'emmanchure sans manche). Devant et dos ont la même demi-largeur à la poitrine
  (`(bust + bustEase) / 4`) donc la même emmanchure ; côtés et épaules cousus à la même longueur par construction.
  Pince de poitrine au côté (`bust-dart-lower|upper`, apex à la pointe de poitrine, jambes égales) dont la largeur
  est `frontWaistLength - backWaistLength` (au moins 4 mm, au plus 100 mm sinon `inconsistent-measurements`) : le
  devant est plus haut de cette largeur au-dessus de la pince. Une pince de taille verticale devant et au dos
  (`dart-1-*`, montent depuis le bas de la pièce). Encolure ronde (quadratique) : creux naturel 0,6 (devant) et 0,25
  (dos) de la demi-encolure, plus `frontNeckDepthMm` / `backNeckDepthMm` ; creusée sous la ligne de poitrine devant
  (ou sous l'aisselle au dos) : 422 `neckline-too-deep`. Manche : hauteur de tête trouvée par dichotomie (60
  itérations) pour que tête = emmanchures devant + dos + `capEaseMm` ; embu réparti à parts égales (les emmanchures
  sont égales) dans `Seam.easeMm` des coutures `armhole-front` et `armhole-back` ; crans : un devant, deux au dos
  (`count` 2), un au sommet, à 40 % de l'emmanchure depuis l'aisselle, répartis proportionnellement sur la tête.
  Mesures obligatoires (jamais estimées, 422 `measurement-required`, le détail cite le champ sans valeur) : tour de
  poitrine `bustGirthMm` (le tour de poitrine de base n'est pas le niveau de la pointe de poitrine) et longueur taille
  dos `backWaistLengthMm` (elle fixe tout l'aplomb vertical). Estimées et listées : longueur taille devant (1,06 / 1,03
  fois la longueur taille dos), pointe de poitrine, largeur d'épaule, profondeur d'emmanchure, et le tour de poignet
  (0,164 / 0,166 fois la poitrine) seulement avec une manche sans `sleeve.hemGirthMm` ; sans ce tour, l'ourlet de
  manche vaut poignet + 40 mm. Erreurs 422 propres : `neckline-too-deep`, `sleeve-shorter-than-cap`.
- `spec/request.py` (requête → entrées du cœur) et `spec/convert.py` (patron → `GarmentSpec`) : seuls endroits qui connaissent le format des contrats.
- `api/routes.py` : valide avec les modèles générés, appelle le cœur, traduit `DraftingError` en RFC 9457.
- Tests : `tests/unit`, `tests/property` (Hypothesis : contours fermés, coutures justes, sortie conforme au contrat),
  `tests/golden` (une référence par type, deux pour le corsage (`case` dans le manifeste), déclarée `candidate` ou `validated` dans `references.json` ; toute différence
  échoue ; `UPDATE_GOLDEN=1` seulement avec l'accord de l'orchestrateur et du modéliste), `tests/api`.
- Changer un calcul = changer `ENGINE_VERSION` (elle entre dans l'empreinte et le cache).
- Commandes : `pnpm nx run patterning:test|lint|typecheck|dev`.
