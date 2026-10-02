/**
 * Textes du banc d'essai des tissus (ADR 0015), au format ICU : chargés avec l'écran, hors du paquet
 * d'entrée. `bench.ts` les enregistre dans le catalogue avant tout rendu de l'écran.
 */
export const frBench = {
  'unit.mm': 'mm',
  'unit.mm2': 'mm²',
  'unit.g': 'g',
  'unit.deg': '°',
  'unit.none': '',
  'fabric.preset.cotton-poplin': 'Popeline de coton',
  'fabric.preset.cotton-wax': 'Wax',
  'fabric.preset.bazin': 'Bazin',
  'fabric.preset.linen': 'Lin',
  'fabric.preset.denim': 'Denim',
  'fabric.preset.silk-satin': 'Satin de soie',
  'fabric.preset.jersey': 'Jersey',
  'fabric.property.weightGPerM2': 'Grammage',
  'fabric.property.thicknessMm': 'Épaisseur',
  'fabric.property.stretchWarpPercent': 'Allongement chaîne',
  'fabric.property.stretchWeftPercent': 'Allongement trame',
  'fabric.property.bendingRigidityMicroNm': 'Rigidité de flexion',
  'fabric.property.frictionCoefficient': 'Frottement',
  'fabricBench.title': 'Banc d’essai des tissus',
  'fabricBench.subtitle':
    'Comparez vos essais d’atelier aux valeurs estimées des préréglages, rendez un verdict et exportez le rapport.',
  'fabricBench.presets.title': 'Préréglages',
  'fabricBench.preset.modified': 'modifié',
  'fabricBench.verdict.validated': 'Validé',
  'fabricBench.verdict.corrected': 'Corrigé',
  'fabricBench.verdict.to-review': 'À revoir',
  'fabricBench.measurements.title': 'Essais d’atelier',
  'fabricBench.test.weighing': 'Pesée',
  'fabricBench.test.thickness': 'Épaisseur',
  'fabricBench.test.stretchWarp': 'Allongement chaîne',
  'fabricBench.test.stretchWeft': 'Allongement trame',
  'fabricBench.test.bendingWarp': 'Flexion chaîne',
  'fabricBench.test.bendingWeft': 'Flexion trame',
  'fabricBench.test.friction': 'Frottement',
  'fabricBench.test.drape': 'Drapé mesuré (Cusick)',
  'fabricBench.tip.weighing':
    'Pesez un échantillon d’au moins 0,1 m² : plus il est grand, plus le grammage est juste.',
  'fabricBench.tip.thickness':
    'Serrez les mâchoires sans écraser le tissu et lisez en plusieurs points.',
  'fabricBench.tip.stretchWarp':
    'Bande de 50 × 300 mm dans le droit fil, repères tracés à 200 mm, masse suspendue de 1 kg.',
  'fabricBench.tip.stretchWeft':
    'Bande de 50 × 300 mm en travers du fil, repères tracés à 200 mm, masse suspendue de 1 kg.',
  'fabricBench.tip.bendingWarp':
    'Bande de 25 × 200 mm dans le droit fil, plan incliné à 41,5°. Quatre lectures : chaque extrémité, chaque face.',
  'fabricBench.tip.bendingWeft':
    'Bande de 25 × 200 mm en travers du fil, plan incliné à 41,5°. Quatre lectures : chaque extrémité, chaque face.',
  'fabricBench.tip.friction':
    'Inclinez lentement la planche jusqu’au glissement ; choisissez la surface d’appui la plus proche du corps (housse de buste de couture, peau synthétique).',
  'fabricBench.tip.drape': 'Éprouvette de 300 mm sur un disque de 180 mm (drapomètre de Cusick).',
  'fabricBench.field.sampleMassG': 'Masse de l’échantillon',
  'fabricBench.field.sampleAreaMm2': 'Aire de l’échantillon',
  'fabricBench.field.readingsMm': 'Lecture {n}',
  'fabricBench.field.stripWidthMm': 'Largeur de la bande',
  'fabricBench.field.gaugeLengthMm': 'Distance entre repères au repos',
  'fabricBench.field.loadedLengthMm': 'Distance entre repères sous charge',
  'fabricBench.field.hangingMassG': 'Masse suspendue',
  'fabricBench.field.overhangLengthsMm': 'Porte-à-faux {n}',
  'fabricBench.field.slideAnglesDeg': 'Angle de glissement {n}',
  'fabricBench.field.counterSurface': 'Surface d’appui',
  'fabricBench.field.drapeCoefficient': 'Coefficient de drapé',
  'fabricBench.option.dress-form-cover': 'Housse de buste de couture',
  'fabricBench.option.skin-substitute': 'Peau synthétique',
  'fabricBench.option.same-fabric': 'Le tissu lui-même',
  'fabricBench.option.other': 'Autre',
  'fabricBench.error.range':
    '{exclusive, select, yes {Plus de {min, number} et au plus {max, number} {unit}} other {Entre {min, number} et {max, number} {unit}}}',
  'fabricBench.error.loadedShorter':
    'La distance sous charge ne peut pas être plus courte que la distance au repos',
  'fabricBench.none': '—',
  'fabricBench.comparison.title': 'Comparaison avec l’estimation',
  'fabricBench.comparison.empty': 'Saisissez un essai complet pour le comparer à l’estimation.',
  'fabricBench.col.property': 'Grandeur',
  'fabricBench.col.estimated': 'Estimée',
  'fabricBench.col.measured': 'Mesurée',
  'fabricBench.col.deviation': 'Écart',
  'fabricBench.col.status': 'Conformité',
  'fabricBench.col.bounds': 'Bornes du contrat',
  'fabricBench.status.within': 'Conforme',
  'fabricBench.status.outside': 'Hors tolérance',
  'fabricBench.propUnit.weightGPerM2': 'g/m²',
  'fabricBench.propUnit.thicknessMm': 'mm',
  'fabricBench.propUnit.stretchWarpPercent': '%',
  'fabricBench.propUnit.stretchWeftPercent': '%',
  'fabricBench.propUnit.bendingRigidityMicroNm': 'µN·m',
  'fabricBench.propUnit.frictionCoefficient': '',
  'fabricBench.valueUnit': '{value, number} {unit}',
  'fabricBench.bounds': 'De {min, number} à {max, number} {unit}',
  'fabricBench.deviation': '{value, number, ::percent sign-always}',
  'fabricBench.extrapolated.warp':
    'Allongement chaîne extrapolé : la charge appliquée s’écarte trop de la charge de référence. Refaites l’essai avec une masse plus proche de 1 kg.',
  'fabricBench.extrapolated.weft':
    'Allongement trame extrapolé : la charge appliquée s’écarte trop de la charge de référence. Refaites l’essai avec une masse plus proche de 1 kg.',
  'fabricBench.bendingWeightEstimated':
    'La rigidité de flexion repose sur le grammage estimé. Pesez un échantillon pour la rendre fiable.',
  'fabricBench.outOfBounds':
    '{property} mesurée hors des bornes du contrat : la valeur estimée est conservée.',
  'fabricBench.drapeComparison':
    'Coefficient de drapé : {measured, number} mesuré, {simulated, number} simulé ({status}).',
  'fabricBench.review.title': 'Revue',
  'fabricBench.review.suggested': 'Verdict proposé : {verdict}',
  'fabricBench.review.verdict': 'Verdict',
  'fabricBench.review.corrected': 'Valeurs corrigées',
  'fabricBench.comment.label': 'Commentaire',
  'fabricBench.comment.counter': '{count, number} / {max, number} caractères',
  'fabricBench.comment.reminder':
    'Ni nom ni donnée de client : seulement ce qui concerne le tissu.',
  'fabricBench.comment.tooLong': 'Commentaire trop long : {max, number} caractères au plus.',
  'fabricBench.report.title': 'Rapport de validation',
  'fabricBench.report.export': 'Exporter le rapport',
  'fabricBench.report.import': 'Importer un rapport',
  'fabricBench.report.exportHint':
    'Revoyez au moins un préréglage, sans erreur de saisie, pour exporter.',
  'fabricBench.report.confirmOverwrite':
    'Des modifications non exportées seront perdues. Importer ce rapport quand même ?',
  'fabricBench.report.dirty': 'Modifications non exportées.',
  'fabricBench.report.imported': 'Rapport importé.',
  'fabricBench.importError.too-large': 'Fichier trop volumineux : {maxKib, number} Kio au plus.',
  'fabricBench.importError.not-json': 'Ce fichier n’est pas un rapport JSON.',
  'fabricBench.importError.unsupported-version':
    'Cette version de rapport n’est pas prise en charge.',
  'fabricBench.importError.invalid': 'Rapport non conforme : {path} ({keyword}).',
  'fabricBench.importError.duplicate-preset': 'Le préréglage {preset} figure deux fois.',
  'fabricBench.notice.simulations-dropped':
    'Les essais de drapé simulés ont été écartés : ils viennent d’une autre version du moteur ({engineVersion}).',
  'fabricBench.notice.estimate-changed':
    '{preset} : l’estimation a changé depuis ce rapport, le verdict repasse à « À revoir ».',
  'fabricBench.col.tolerance': 'Tolérance',
  'fabricBench.tolerance.relative': '± {relative, number, ::percent}',
  'fabricBench.tolerance.relativeFloor': '± {relative, number, ::percent} (min. {floor})',
  'fabricBench.drape.title': 'Drapé de Cusick simulé',
  'fabricBench.drape.intro':
    'Simule une éprouvette de {specimen, number} mm sur un disque de {disc, number} mm, vue de dessus. Chaque essai prend quelques secondes.',
  'fabricBench.drape.test.estimated': 'Valeurs estimées',
  'fabricBench.drape.test.candidate': 'Valeurs candidates',
  'fabricBench.drape.test.corrected': 'Valeurs corrigées',
  'fabricBench.drape.run': 'Simuler',
  'fabricBench.drape.rerun': 'Relancer',
  'fabricBench.drape.running': 'Calcul en cours…',
  'fabricBench.drape.idle': 'Pas encore simulé.',
  'fabricBench.drape.failed': 'La simulation a échoué. Vérifiez les valeurs et relancez.',
  'fabricBench.drape.coefficient': 'Coefficient de drapé : {value, number}',
  'fabricBench.drape.notConverged': 'Équilibre non atteint : coefficient de drapé indicatif.',
  'fabricBench.drape.noOutline':
    'Essai relu d’un rapport : le contour de l’ombre n’est pas conservé. Relancez pour le voir.',
  'fabricBench.drape.measured':
    'Mesuré : {measured, number} ({status}, à ± {tolerance, number} près).',
  'fabricBench.drape.shadowTitle': 'Ombre vue de dessus : {test}',
  'fabricBench.drape.shadowDesc':
    'Disque de {disc, number} mm, éprouvette à plat de {specimen, number} mm en pointillés, ombre du tissu drapé.',
} as const;
