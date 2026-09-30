# 0004 — Reprise du moteur mannequin du prototype

**Contexte.** Le prototype contient un moteur mannequin éprouvé (MakeHuman CC0, ajustement aux mesures à
6 mm près, tête lisse, pose). Son fichier principal fait environ 600 lignes, au-delà des limites des directives.

**Décision.** Le code est repris tel quel dans `engines/mannequin/src/core/makehuman.js`, transformé en module
ESM sans variable globale, derrière une API typée (`src/index.ts`) qui parle le contrat (`MeasurementSet`, mm).
Le fichier et le script de construction des données (`tools/build_makehuman.py`) sont exclus du lint.
Les données sont un binaire gzip à extension neutre (`assets/makehuman.mhz`) pour qu'aucun serveur ne le
décompresse en route.

**Conséquences.** Exception temporaire : le fichier doit être découpé en modules de moins de 300 lignes,
avec leurs tests, pendant la phase 1 ; les repères de hauteur (entrejambe) de `prototype/js/body.js` restent
à reprendre. Tant que ce n'est pas fait, toute modification de `makehuman.js` passe par une revue humaine.

**Suivi.** Exception levée par la tâche 1.12 : `makehuman.js` est remplacé par des modules TypeScript de moins
de 300 lignes, testés, sans exclusion de lint ; `test/characterization.test.ts` fige la sortie de l'ancien code
(équivalence vérifiée au bit près). Les repères de hauteur restent à reprendre (tâche 1.13).
