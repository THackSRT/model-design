# Phase 1 — atelier virtuel

Objectif : une interface simple pour **obtenir les patrons, les modifier et les voir sur un mannequin 2D et 3D**.
Porte de sortie : des patrons validés sur toile par un modéliste.

## Ce qui est prêt

- **Tranche verticale de bout en bout** : `apps/studio` → `services/designs` → `engines/patterning`, et le
  mannequin MakeHuman ajusté dans le navigateur (`engines/mannequin`) puis affiché en 3D (`packages/viewer3d`).
  Un patron impossible revient en erreur RFC 9457, traduite à l'écran.
- **Service de référence** `services/designs` : quatre couches, dépôts en mémoire et PostgreSQL (migrations SQL,
  sécurité au niveau des lignes, outbox dans la même transaction), client du moteur avec délai.
- **Moteur de référence** `engines/patterning` : cœur pur et déterministe, tests unitaires, de propriétés
  (Hypothesis) et de référence (golden), frontières vérifiées par import-linter.
- **Squelettes générés** `engines/manufacturing` et `engines/drape`.
- **Outillage** : contrats et code généré (`pnpm contracts:gen|check`), générateurs (`pnpm gen`), règles
  d'architecture dans le lint, `pnpm check` (16 projets et documentation), hook `pre-push`, intégration continue manuelle.
- **Conteneurs** : une image par moteur, service et application ; toute la pile tourne avec `pnpm stack:up`.
- **Documentation** : ce site, le `CHANGELOG.md` et le [tableau des travaux](travaux.md).

Limite assumée : le tracé de la jupe droite est volontairement simple ; il valide la chaîne, pas la coupe.

## Travaux de la phase 1

Le détail, avec le statut de chaque travail, est dans le [tableau des travaux](travaux.md). En résumé, dans l'ordre :

Chaque ligne est dimensionnée pour une demande de fusion (humain ou agent).

1. **GarmentCode dans `engines/patterning`** : adaptateur dans `spec/` (centimètres ↔ mm), composants corsage,
   jupes, manches, pantalons ; références golden validées par le modéliste.
2. **Découpage du moteur mannequin** (ADR 0004) en modules testés ; reprise des repères de hauteur
   (`prototype/js/body.js`) ; ajustement dans un Web Worker pour ne pas figer l'écran.
3. **Vues 2D trait du mannequin** (silhouettes SVG, reprise de `prototype/js/viewer3d.js`) dans `packages/viewer3d`.
4. **Retouches** : édition des paramètres du modèle dans le studio, liste et comparaison des versions
   (`GET /v1/designs/{id}/versions`).
5. **`engines/manufacturing`** : valeurs de couture, crans, gradation, plan de coupe (reprise de
   `prototype/js/pattern.js` et `geom.js`), exports SVG 1:1, PDF A4 tuilé, DXF-AAMA.
6. **`engines/drape`** : couture virtuelle et simulation (NVIDIA Warp) en tâche NATS, sortie glTF, carte d'aisance.
7. **Relais de l'outbox vers NATS JetStream** dans `service-kit`, avec tests d'intégration en CI.
8. **Studio** : Storybook et captures comparées, bibliothèque de traduction ICU, chargement différé de three.js.
9. **Plateforme** : construction des images en CI, charts Helm, environnement de recette.
10. **Porte** : toiles d'essai coupées depuis les exports, écarts notés et corrigés, références golden figées.
