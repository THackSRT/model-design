# Phase 1 — atelier virtuel

Objectif : une interface simple pour **obtenir les patrons, les modifier et les voir sur un mannequin 2D et 3D**.
Porte de sortie : des patrons validés sur toile par un modéliste.

## Direction depuis le 4 octobre 2026

La phase 1 se termine avec le studio v2 : FreeSewing et document de modèle ([ADR 0019](../adr/0019-trace-freesewing.md),
[ADR 0020](../adr/0020-document-de-modele-et-operations.md)), calcul local et moteurs TypeScript
([ADR 0021](../adr/0021-studio-local-et-refonte-des-moteurs.md)), interface v2
([ADR 0022](../adr/0022-interface-du-studio-v2.md)), IA préparée ([ADR 0023](../adr/0023-preparation-ia.md)). Le 2D
d'abord, puis la 3D. Feuille de route : lots 7 à 12 du [plan d'action](plan-action-plateforme.md) ; preuve : [essai
des tuniques](essai-tuniques.md).

## Ce qui est prêt

- **Historique et comparaison des versions** : chaque calcul d'un patron crée une nouvelle version stockée au
  service ; dans le studio, le panneau « Historique » de l'onglet Patron liste les versions de la session,
  permet de reprendre l'une d'elles (avec confirmation si des modifications non calculées existent), et de
  comparer deux versions pour voir les changements de paramètres et mesures avec écarts d'aire et périmètre
  par pièce (ADR 0014 : limité au modèle de la session).
- **Maillage triangulaire des pièces et du vêtement complet** (ENGINE_VERSION 0.4.0) : Delaunay contraint pour
  la simulation drapé (pas de < 25 mm en brouillon, < 15 mm en standard, angle > 20°) ; cinq vêtements de
  référence se maillent en 0,02 à 0,17 s (jupe cercle standard : 9 756 sommets) ; ADR 0013 complétée.
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
- **Drapé sur l'avatar** (ENGINE_VERSION 0.5.0) : calcule le mannequin depuis les mesures et les options, place
  chaque pièce autour du corps selon `Panel.placement`, simule, applique l'aisance et l'allongement ; jupe
  droite en brouillon drape correctement (convergence 116 pas, aisance bassin ~6 mm). Autres vêtements non
  maintenus (1.19e2 à venir).
- **Moteur de fabrication** (`engines/manufacturing`, port 3202, ENGINE_VERSION 0.4.0) : pièces de coupe avec
  valeurs de couture par bord, crans demandés ou automatiques, droit fil, pliure, pinces (pont) ; gradation par
  recalcul ; plan de coupe simple et déterministe ; exports SVG 1:1, PDF A4 tuilé et DXF-AAMA en mm. Erreurs
  RFC 9457 typées.
- **Moteur drapé** (`engines/drape`, paquet `@atelier/drape`, port 3203, ENGINE_VERSION 0.5.0) : cœur de
  simulation XPBD sur CPU en TypeScript (ADR 0013, exception à l'ADR 0003), sans dépendance de calcul,
  déterministe ; étirement chaîne/trame, flexion, coutures, collision, frottement, arrêt au repos ; λ cumulé
  par sous-pas (XPBD correct), option `iterations` (1–32), validation des maillages ; essai de drapé de
  Cusick simulé (coefficient de drapé, 0,75–2 s) ; tests physiques, `/health`. Recalcule le mannequin depuis
  les mesures et les options, place chaque pièce selon `Panel.placement`, applique l'aisance et l'allongement ;
  jupe droite en brouillon drape correctement (convergence 116 pas, aisance bassin ~6 mm). Autres vêtements non
  maintenus (1.19e2 à venir). Tâche NATS, résultats glTF lus depuis S3 (1.19g1–g2 : routes dans `designs`,
  consommateur, variables S3).
- **Banc d'essai des tissus** (ADR 0015) : contrats et schémas (`fabric-physics`, mesures, valeurs dérivées,
  rapport de validation) ; moteur : essais d'atelier (pesée, épaisseur, allongement, rigidité, frottement),
  tolérances et écarts, essai de Cusick simulé ; features : modèle de vue `useFabricBench`, import/export du
  rapport ; ui-web : composants `Tabs`, `TextArea`, `ChoiceGroup`, `FileButton` ; studio : onglets Patron |
  Tissus et écran du banc avec Worker de Cusick et vue de dessus (1.39a–j).
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
4. ✅ **Retouches** : liste et comparaison des versions (`GET /v1/designs/{id}/versions`, 1.16a ✅, curseur
   opaque, pas de mesures dans les résumés) ; features clients et modèle de vue (1.16b ✅) ; panneau
   Historique du studio (1.16c ✅) avec reprise et comparaison. Édition des paramètres du modèle reste à faire.
5. ✅ **`engines/manufacturing`** : pièces de coupe, valeurs de couture (défaut 10 mm, ourlet 30 mm), crans,
   droit fil, pliure, pinces ; gradation par recalcul ; plan de coupe ; exports SVG 1:1 (1.18a), PDF A4
   tuilé (1.18b) et DXF-AAMA (1.18c).
6. 🟡 **`engines/drape`** : contrat du drapé physique (1.19a ✅, `Panel.placement`) ; simulation XPBD sur CPU
   en TypeScript (1.19b ✅, ENGINE_VERSION 0.2.0–0.4.0) ; placement de chaque pièce (1.19c ✅) ; maillage
   triangulaire Delaunay contraint (1.19d ✅, ENGINE_VERSION 0.4.0, 0,02–0,17 s pour les références) ;
   drapé sur l'avatar avec aisance (1.19e ✅, ENGINE_VERSION 0.5.0, jupe droite brouillon validée) ;
   routes `/drapes` dans `designs` avec consommateur et modèle glTF depuis S3 (1.19g1–g2 ✅). Restent
   1.19e2 (maintien des autres vêtements), 1.19f (glTF et S3 complétement intégrés).
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
13. ✅ **Banc d'essai des tissus** (ADR 0015, 1.37, 1.39a–j) : contrats et schémas `fabric-*` ; moteur :
    essais d'atelier (pesée, épaisseur, allongement, rigidité, frottement), essai de Cusick simulé ;
    features : modèle de vue, import/export du rapport ; studio : onglets Patron | Tissus et écran du banc
    avec Worker de Cusick.
14. **Plateforme** : construction des images en CI, charts Helm, environnement de recette (reporté en phase 2).
15. **Porte** : toiles d'essai coupées depuis les exports, écarts notés et corrigés, références golden figées (lot 12).
16. ⬜ **Lot 7 — Fondations 2D** : contrats du document de modèle, `engines/drafting` (FreeSewing, fiches,
    opérations), `engines/cutting`, `engines/flats`, versions du document dans `designs`, mannequin étendu
    (1.53–1.61).
17. ⬜ **Lot 8 — Studio v2, parcours 2D** : jetons et composants v2, magasin du document et commandes, scène et
    fil, étapes Modèle, Édition, Matières, Patrons, Habillage, tests d'usage (1.62–1.70).
18. ⬜ **Lot 9 — 3D interactive** : drapé pas à pas en Worker, manche sous l'aisselle, vue 3D texturée,
    budgets (1.71–1.75).
19. ⬜ **Lot 10 — Préparation de l'IA** : commandes exportées en outils, panneau Assistant, contrat de la
    passerelle, jeu d'évaluation (1.76–1.78).
20. ⬜ **Lot 11 — Nettoyage** : retrait des moteurs Python et de l'ancien studio, budgets vérifiés (1.79–1.80).
21. ⬜ **Lot 12 — Porte** : toiles des cinq tuniques et du catalogue 1, revue de la phase (1.81–1.82).
