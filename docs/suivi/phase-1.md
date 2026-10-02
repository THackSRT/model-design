# Phase 1 — atelier virtuel

Objectif : une interface simple pour **obtenir les patrons, les modifier et les voir sur un mannequin 2D et 3D**.
Porte de sortie : des patrons validés sur toile par un modéliste.

## Ce qui est prêt

- **Tranche verticale de bout en bout** : `apps/studio` → `services/designs` → `engines/patterning` (quatre
  types de vêtement, douze mesures facultatives), et le mannequin MakeHuman ajusté dans le navigateur
  (`engines/mannequin`) puis affiché en 3D (`packages/viewer3d`) ou en silhouettes 2D. Un patron impossible
  revient en erreur RFC 9457, traduite à l'écran.
- **Service de référence** `services/designs` : quatre couches, dépôts en mémoire et PostgreSQL (migrations SQL,
  sécurité au niveau des lignes, outbox dans la même transaction), relais de l'outbox vers NATS JetStream,
  client du moteur avec délai.
- **Moteur de référence** `engines/patterning` : cœur pur et déterministe, tests unitaires, de propriétés
  (Hypothesis) et de référence (golden), frontières vérifiées par import-linter.
- **Moteur mannequin** (`engines/mannequin`) : modules testés (geometry, morph, measure, fit, render, pose),
  repères de hauteur (`landmarksMm` : crotch, hip, waist, neck, knee, ankle), repères d'épaule et de poignet
  avec axes des bras (`armsMm` par bras), ajustement de l'entrejambe sur `crotchHeightMm` (plage 740–835 mm
  pour 1700 mm de stature). Habillage géométrique rapide (`dressMannequin()`, 35–50 ms). Ajustement dans un
  Web Worker (`apps/studio`) : l'écran du studio ne fige plus.
- **Silhouettes 2D du mannequin** (face, profil, dos) affichées dans le studio de patron : bascule interactif 3D / silhouettes vectorielles.
- **Moteur de fabrication** (`engines/manufacturing`, port 3202, ENGINE_VERSION 0.4.0) : pièces de coupe avec
  valeurs de couture par bord, crans demandés ou automatiques, droit fil, pliure, pinces (pont) ; gradation par
  recalcul ; plan de coupe simple et déterministe ; exports SVG 1:1, PDF A4 tuilé et DXF-AAMA en mm. Erreurs
  RFC 9457 typées.
- **Moteur drapé** (`engines/drape`, paquet `@atelier/drape`, port 3203, ENGINE_VERSION 0.2.0) : cœur de
  simulation XPBD sur CPU en TypeScript (ADR 0013, exception à l'ADR 0003), sans dépendance de calcul,
  déterministe ; étirement chaîne/trame, flexion, coutures, collision, frottement, arrêt au repos ; tests
  physiques, `/health`. Maillage, glTF en S3 à cache (version + avatar), tâche NATS, événements
  `drape.requested`, `drape.completed`, `drape.failed` à venir (1.19d–g).
- **Outillage** : contrats et code généré (`pnpm contracts:gen|check`), générateurs (`pnpm gen`), règles
  d'architecture dans le lint, `pnpm check` (16 projets et documentation), hook `pre-push`, intégration continue manuelle.
- **Conteneurs** : une image par moteur, service et application ; toute la pile tourne avec `pnpm stack:up`.
- **Documentation** : ce site, le `CHANGELOG.md` et le [tableau des travaux](travaux.md).

## Travaux de la phase 1

Le détail, avec le statut de chaque travail, est dans le [tableau des travaux](travaux.md). En résumé, dans l'ordre :

Chaque ligne est dimensionnée pour une demande de fusion (humain ou agent).

1. ✅ **GarmentCode dans `engines/patterning`** : réécrit en Python pur, typé, millimètres (ADR 0010) ; quatre
   types de vêtement (`straight-skirt`, `circle-skirt`, `trousers`, `bodice`) ; douze mesures facultatives ISO
   8559-1 ; jupes droite à pinces et cercle (ENGINE_VERSION 0.2.0, références « candidates »), pantalon et
   corsage avec ou sans manches (ENGINE_VERSION 0.5.0, références « candidates ») livrés.
2. ✅ **Découpage du moteur mannequin** (ADR 0004) en modules testés ; reprise des repères de hauteur
   (`prototype/js/body.js`) ; ajustement dans un Web Worker pour ne pas figer l'écran.
3. ✅ **Vues 2D trait du mannequin** (silhouettes SVG, reprise de `prototype/js/viewer3d.js`) affichées dans
   le studio (`packages/viewer3d` + `apps/studio`).
4. 🟡 **Retouches** : édition des paramètres du modèle dans le studio (1.16b ⬜), liste et comparaison des
   versions (`GET /v1/designs/{id}/versions`, 1.16a ✅, curseur opaque, pas de mesures dans les résumés).
5. ✅ **`engines/manufacturing`** : pièces de coupe, valeurs de couture (défaut 10 mm, ourlet 30 mm), crans,
   droit fil, pliure, pinces ; gradation par recalcul ; plan de coupe ; exports SVG 1:1 (1.18a), PDF A4
   tuilé (1.18b) et DXF-AAMA (1.18c).
6. 🟡 **`engines/drape`** : placement de chaque pièce (1.19c ✅, `Panel.placement` : zone, côté, sens, ancrage,
   aisance) ; couture virtuelle et simulation XPBD sur CPU en TypeScript (1.19b ✅), en tâche NATS, sortie
   glTF, carte d'aisance, cache S3 (1.19 🟡, restent 1.19d-g).
7. ✅ **Relais de l'outbox vers NATS JetStream** : implémenté dans `service-kit` et branché dans `designs`
   avec flux `DESIGNS` (sujets `design.>`), variables d'environnement `NATS_URL`, `OUTBOX_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`.
8. ✅ **Studio** : `three.js` chargé à la demande (paquet de 806 kB réduit à 303 kB) ; bibliothèque de
   traduction ICU (`intl-messageformat`) avec pluriels, genres et formatage de nombres.
9. ✅ **Studio (suite)** : brancher le moteur de fabrication (1.29), afficher les pièces de coupe et les
   téléchargements (1.30), choix du type de vêtement et formulaires dynamiques (1.31).
10. ✅ **Erreurs du patronage relayées** (1.32) : huit types stables du moteur remontés en 422 avec détail ;
    autre type devenant `pattern-impossible` ; panne en 502 sans relayer le corps (ADR 0014).
11. ✅ **Habillage du mannequin** (1.34a ✅, 1.34b ✅, 1.34) : approche géométrique sans physique (anneaux
    horizontaux, 35–50 ms) pour aperçu du drapé ; zones trop justes signalées en mm ; vue 3D translucide
    dans le studio avec silhouette en trait superposée.
12. ✅ **Repères d'épaule et de poignet** (1.35) : `landmarksMm.shoulder|wrist` (hauteurs), `armsMm`
    (pivot, poignet, axe, longueur) pour habillage géométrique précis.
13. **Plateforme** : construction des images en CI, charts Helm, environnement de recette.
14. **Porte** : toiles d'essai coupées depuis les exports, écarts notés et corrigés, références golden figées.
