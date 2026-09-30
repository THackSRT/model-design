# Moteur mannequin (TypeScript)

Rôle : mesures du contrat (mm) → corps MakeHuman (CC0) ajusté à 6 mm près, visage sans traits, bras abaissés.
Tourne à l'identique dans le navigateur et dans Node.

- `src/index.ts` : API typée (`loadMannequinEngine`, `fit`) ; conversion mm → cm ici seulement.
- `src/core/makehuman.js` : reprise du prototype, exception documentée (ADR 0004) ; à découper en phase 1.
- `src/core/plain-face.ts` : visage sans traits et aplati (yeux, sourcils, nez, bouche effacés, crâne gardé) ;
  `src/core/thin-plate.ts` : spline de plaque mince qui porte la surface de remplacement.
- `assets/makehuman.mhz` : données gzip, construites par `tools/build_makehuman.py` depuis le dépôt MakeHuman.
- Tests : `test/mannequin.test.ts` (précision de l'ajustement, données déjà décompressées, maillage).
- Commandes : `pnpm nx run @atelier/mannequin:test|lint|typecheck|build`.
