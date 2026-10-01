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
  repères de hauteur (`landmarksMm` : crotch, hip, waist, neck, knee, ankle), ajustement de l'entrejambe sur
  `crotchHeightMm` (plage 740–835 mm pour 1700 mm de stature). Ajustement dans un Web Worker
  (`apps/studio`) : l'écran du studio ne fige plus.
- **Silhouettes 2D du mannequin** (face, profil, dos) affichées dans le studio de patron : bascule interactif 3D / silhouettes vectorielles.
- **Moteur de fabrication** (`engines/manufacturing`, port 3202) : pièces de coupe avec valeurs de couture par
  bord, crans demandés ou automatiques, droit fil, pliure, pinces (pont) ; gradation par recalcul ; plan de
  coupe simple et déterministe ; exports SVG 1:1 en mm (PDF A4 tuilé et DXF-AAMA à venir). Erreurs RFC 9457
  typées.
- **Squelette généré** `engines/drape`.
- **Outillage** : contrats et code généré (`pnpm contracts:gen|check`), générateurs (`pnpm gen`), règles
  d'architecture dans le lint, `pnpm check` (16 projets et documentation), hook `pre-push`, intégration continue manuelle.
- **Conteneurs** : une image par moteur, service et application ; toute la pile tourne avec `pnpm stack:up`.
- **Documentation** : ce site, le `CHANGELOG.md` et le [tableau des travaux](travaux.md).

## Travaux de la phase 1

Le détail, avec le statut de chaque travail, est dans le [tableau des travaux](travaux.md). En résumé, dans l'ordre :

Chaque ligne est dimensionnée pour une demande de fusion (humain ou agent).

1. ✅ **GarmentCode dans `engines/patterning`** : réécrit en Python pur, typé, millimètres (ADR 0010) ; quatre
   types de vêtement (`straight-skirt`, `circle-skirt`, `trousers`, `bodice`) ; douze mesures facultatives ISO
   8559-1 ; jupes droite à pinces et cercle livrées (ENGINE_VERSION 0.2.0, références « candidates »),
   pantalon et corsage à venir.
2. ✅ **Découpage du moteur mannequin** (ADR 0004) en modules testés ; reprise des repères de hauteur
   (`prototype/js/body.js`) ; ajustement dans un Web Worker pour ne pas figer l'écran.
3. ✅ **Vues 2D trait du mannequin** (silhouettes SVG, reprise de `prototype/js/viewer3d.js`) affichées dans
   le studio (`packages/viewer3d` + `apps/studio`).
4. **Retouches** : édition des paramètres du modèle dans le studio, liste et comparaison des versions
   (`GET /v1/designs/{id}/versions`).
5. ✅ **`engines/manufacturing`** : pièces de coupe, valeurs de couture (défaut 10 mm, ourlet 30 mm), crans,
   droit fil, pliure, pinces ; gradation par recalcul ; plan de coupe ; exports SVG 1:1 (1.18a) ; PDF A4
   tuilé et DXF-AAMA à venir (1.18b/c).
6. **`engines/drape`** : couture virtuelle et simulation (NVIDIA Warp) en tâche NATS, sortie glTF, carte d'aisance.
7. ✅ **Relais de l'outbox vers NATS JetStream** : implémenté dans `service-kit` et branché dans `designs`
   avec flux `DESIGNS` (sujets `design.>`), variables d'environnement `NATS_URL`, `OUTBOX_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`.
8. ✅ **Studio** : `three.js` chargé à la demande (paquet de 806 kB réduit à 303 kB) ; bibliothèque de
   traduction ICU (`intl-messageformat`) avec pluriels, genres et formatage de nombres.
9. **Studio (suite)** : brancher le moteur de fabrication, afficher les pièces de coupe et les téléchargements,
   choix du type de vêtement et formulaires dynamiques.
10. **Plateforme** : construction des images en CI, charts Helm, environnement de recette.
11. **Porte** : toiles d'essai coupées depuis les exports, écarts notés et corrigés, références golden figées.
