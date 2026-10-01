# Moteur patterning (moteur de référence)

Rôle : mesures + paramètres → spécification de patron (`GarmentSpec`, mm). Sans état, déterministe.
Contrat : `contracts/openapi/patterning.yaml`. Temps visé : moins de 100 ms par tracé (budget de test : 1 s).

- `core/` : calcul pur : `body.py` (mesures complétées, rapports d'estimation), `curves.py` (tangentes, arcs, découpe
  à une longueur), `checks.py` (contours, coutures avec embu, crans ; une violation = `PatternCheckError`, bogue),
  `drafting.py` (type de vêtement → tracé, contrôle de chaque sortie ; type sans tracé = 422
  `garment-type-not-supported`), `errors.py`, `garments/` (un module par vêtement, `parts.py` pour les outils
  communs : points arrondis, pièce en miroir, crans). Interdit d'y importer FastAPI, Pydantic ou les contrats
  (vérifié par `.importlinter`).
- Tracés disponibles (version 0.2.0) : `straight-skirt` (`garments/straight_skirt.py`), `circle-skirt`
  (`garments/circle_skirt.py`). Pantalon et corsage : à venir (1.11d, 1.11e).
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
- `spec/request.py` (requête → entrées du cœur) et `spec/convert.py` (patron → `GarmentSpec`) : seuls endroits qui connaissent le format des contrats.
- `api/routes.py` : valide avec les modèles générés, appelle le cœur, traduit `DraftingError` en RFC 9457.
- Tests : `tests/unit`, `tests/property` (Hypothesis : contours fermés, coutures justes, sortie conforme au contrat),
  `tests/golden` (une référence par type, déclarée `candidate` ou `validated` dans `references.json` ; toute différence
  échoue ; `UPDATE_GOLDEN=1` seulement avec l'accord de l'orchestrateur et du modéliste), `tests/api`.
- Changer un calcul = changer `ENGINE_VERSION` (elle entre dans l'empreinte et le cache).
- Commandes : `pnpm nx run patterning:test|lint|typecheck|dev`.
