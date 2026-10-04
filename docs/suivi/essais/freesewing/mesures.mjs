// D. Union des mesures requises des six modèles : nom FreeSewing, unité, signification, équivalent ISO 8559-1 probable,
// champ du contrat MeasurementSet du dépôt, et possibilité de les mesurer sur un mannequin 3D ajusté.
import { writeFileSync } from 'node:fs'
import { DESIGNS } from './lib/designs.mjs'
import { measurements as ALL, degreeMeasurements } from '@freesewing/config'

// kind : tour (coupe plane), arc (part d'une coupe), hauteur (écart de hauteurs entre repères),
//        longueur (le long du corps), distance (droite entre repères), angle
// mannequin : oui (repère ou outil déjà fourni par le moteur mannequin), repere (repère anatomique à ajouter), delicat
const META = {
  biceps: { fr: 'Tour de bras (partie la plus forte du haut du bras)', iso: 'upper-arm girth (tour de haut de bras)', field: 'upperArmGirthMm', kind: 'tour', mannequin: 'oui', how: 'coupe plane perpendiculaire à l\'axe du bras, maximum le long du bras ; bras collés au torse : utiliser l\'axe fourni (armsMm) et non une coupe horizontale' },
  bustSpan: { fr: 'Écart entre les pointes de seins (horizontal)', iso: 'bust point width (écart des pointes de seins)', field: 'bustPointWidthMm', kind: 'distance', mannequin: 'repere', how: 'distance entre les deux sommets de la poitrine : repère « pointe de sein » à ajouter (extremum antérieur de la poitrine)' },
  chest: { fr: 'Tour de poitrine (le plus fort, horizontal)', iso: 'bust girth (femme) / chest girth (homme)', field: 'bustGirthMm (femme) ou chestGirthMm (homme)', kind: 'tour', mannequin: 'oui', how: 'coupe plane horizontale au maximum entre aisselles et taille ; pour une femme, le niveau passe par les pointes de seins' },
  crossSeam: { fr: 'Montant total : de la taille devant, entre les jambes, à la taille dos', iso: 'crotch length (longueur de fourche, « body rise »)', field: '—', kind: 'longueur', mannequin: 'delicat', how: 'chemin géodésique sur le maillage, du milieu devant de la taille au milieu dos par l\'entrejambe ; la zone entre les cuisses est délicate' },
  crossSeamFront: { fr: 'Montant devant : de la taille devant à la fourche', iso: 'crotch length, partie devant (à confirmer)', field: '—', kind: 'longueur', mannequin: 'delicat', how: 'géodésique jusqu\'à un point de fourche à définir (FreeSewing en donne trois définitions)' },
  head: { fr: 'Tour de tête (à hauteur de front)', iso: 'head girth (tour de tête)', field: '—', kind: 'tour', mannequin: 'repere', how: 'coupe plane légèrement inclinée au niveau du front ; le visage du mannequin est sans traits : repère front à définir' },
  highBust: { fr: 'Tour de poitrine haute (sous les bras, au-dessus de la poitrine)', iso: 'chest girth au niveau de l\'aisselle / upper chest girth', field: '—', kind: 'tour', mannequin: 'repere', how: 'coupe plane à la hauteur du creux d\'aisselle (repère aisselle à ajouter) ; bras collés au torse : même précaution que pour le biceps' },
  hips: { fr: 'Tour de hanches hautes (sommet des os iliaques) : n\'est PAS le tour de bassin ISO', iso: 'top hip girth / upper hip girth', field: '— (hipGirthMm correspond à « seat »)', kind: 'tour', mannequin: 'repere', how: 'coupe plane à la hauteur de la crête iliaque (repère à ajouter)' },
  hpsToBust: { fr: 'Du point haut d\'épaule (HPS) à la pointe de sein (vertical)', iso: 'neck shoulder point to bust point', field: 'neckShoulderToBustPointMm', kind: 'hauteur', mannequin: 'repere', how: 'écart de hauteur entre les repères HPS et pointe de sein (deux repères à ajouter)' },
  hpsToWaistBack: { fr: 'Du HPS à la taille, dans le dos', iso: 'back neck point to waist (longueur taille dos) ; départ cervicale au lieu du HPS', field: 'backWaistLengthMm (écart de point de départ)', kind: 'longueur', mannequin: 'repere', how: 'longueur le long du dos entre HPS et taille ; la cervicale du contrat n\'est pas le HPS : prévoir une conversion ou le repère HPS' },
  hpsToWaistFront: { fr: 'Du HPS à la taille devant, par la pointe de sein', iso: 'front neck point to waist / front waist length', field: 'frontWaistLengthMm', kind: 'longueur', mannequin: 'repere', how: 'géodésique devant, du HPS à la taille en passant par la pointe de sein (repères HPS et pointe de sein)' },
  knee: { fr: 'Tour de genou', iso: 'knee girth', field: 'kneeGirthMm', kind: 'tour', mannequin: 'oui', how: 'coupe plane horizontale au niveau du genou (repère knee déjà fourni)' },
  neck: { fr: 'Tour de cou (à la hauteur du col)', iso: 'neck girth (à confirmer face à neck base girth)', field: 'neckGirthMm', kind: 'tour', mannequin: 'repere', how: 'coupe plane inclinée passant par la cervicale et le creux sus-sternal (repères à ajouter)' },
  seat: { fr: 'Tour de fesses (le plus fort, horizontal)', iso: 'hip girth / maximum hip girth (seat)', field: 'hipGirthMm', kind: 'tour', mannequin: 'oui', how: 'coupe plane au maximum de circonférence entre la taille et l\'entrejambe (repère hip déjà fourni)' },
  seatBack: { fr: 'Part dos du tour de fesses (de côté à côté par le dos)', iso: '— (partition d\'un tour, absente de l\'ISO)', field: '—', kind: 'arc', mannequin: 'oui', how: 'arc dorsal de la coupe « seat », séparé du devant par le plan frontal passant par les points latéraux' },
  shoulderSlope: { fr: 'Pente d\'épaule (degrés sous l\'horizontale)', iso: '— (pas d\'angle dans les listes ISO relevées)', field: '—', kind: 'angle', mannequin: 'repere', how: 'angle de la droite HPS - pointe d\'épaule avec l\'horizontale, dans le plan frontal ; le moteur fournit le pivot d\'épaule, plus bas que l\'acromion' },
  shoulderToElbow: { fr: 'De la pointe d\'épaule au coude', iso: 'partie de outer arm length (à confirmer)', field: '—', kind: 'longueur', mannequin: 'repere', how: 'longueur le long du bras entre acromion et coude (repères à ajouter ; axe de bras fourni par le moteur)' },
  shoulderToShoulder: { fr: 'D\'une pointe d\'épaule à l\'autre, par le dos', iso: 'back shoulder width', field: 'shoulderWidthMm', kind: 'longueur', mannequin: 'repere', how: 'longueur le long du dos entre les deux acromions (repère acromion à ajouter)' },
  shoulderToWrist: { fr: 'Longueur de manche : pointe d\'épaule au poignet, bras légèrement plié', iso: 'outer arm length (arm length)', field: 'armLengthMm', kind: 'longueur', mannequin: 'oui', how: 'armsMm.lengthMm donne pivot - poignet (environ 0,26 de la stature) ; le pivot est plus bas que l\'acromion : corriger ou ajouter le repère acromion' },
  underbust: { fr: 'Tour sous la poitrine', iso: 'under bust girth', field: 'underBustGirthMm', kind: 'tour', mannequin: 'repere', how: 'coupe plane au pli sous-mammaire (hauteur à repérer)' },
  waist: { fr: 'Tour de taille (partie la plus étroite sous la cage thoracique)', iso: 'waist girth', field: 'waistGirthMm', kind: 'tour', mannequin: 'oui', how: 'coupe plane, minimum local entre sous-poitrine et hanches (repère waist déjà fourni)' },
  waistBack: { fr: 'Part dos du tour de taille', iso: '— (partition d\'un tour, absente de l\'ISO)', field: '—', kind: 'arc', mannequin: 'oui', how: 'arc dorsal de la coupe « waist », séparé du devant par le plan frontal passant par les points latéraux' },
  waistToArmpit: { fr: 'De la taille à l\'aisselle, côté du corps (vertical)', iso: 'side waist length / écart waist height - axilla height (à confirmer)', field: '—', kind: 'hauteur', mannequin: 'repere', how: 'écart de hauteur entre taille et creux d\'aisselle (repère aisselle à ajouter)' },
  waistToFloor: { fr: 'De la taille au sol (vertical, côté)', iso: 'waist height (hauteur de taille)', field: 'waistHeightMm', kind: 'hauteur', mannequin: 'oui', how: 'landmarksMm.waist, déjà fourni par le moteur' },
  waistToHips: { fr: 'De la taille au sommet des os iliaques (vertical, côté)', iso: 'waist height - top hip height', field: '— (hipHeightMm est le niveau du tour le plus fort)', kind: 'hauteur', mannequin: 'repere', how: 'écart de hauteur taille - crête iliaque (repère à ajouter)' },
  waistToKnee: { fr: 'De la taille au genou (vertical, côté)', iso: 'waist height - knee height', field: 'waistHeightMm - kneeHeight', kind: 'hauteur', mannequin: 'oui', how: 'landmarksMm.waist - landmarksMm.knee, déjà fournis' },
  waistToSeat: { fr: 'De la taille au niveau des fesses (vertical, côté)', iso: 'waist height - hip height (hauteur du tour le plus fort)', field: 'waistHeightMm - hipHeightMm', kind: 'hauteur', mannequin: 'oui', how: 'landmarksMm.waist - landmarksMm.hip, déjà fournis' },
  waistToUpperLeg: { fr: 'De la taille au tour de haut de cuisse (vertical, côté)', iso: 'waist height - thigh girth height', field: '— (proche de crotchHeightMm)', kind: 'hauteur', mannequin: 'repere', how: 'approchable par taille - entrejambe (landmarksMm.crotch) ; le niveau exact de la cuisse est à définir' },
  wrist: { fr: 'Tour de poignet', iso: 'wrist girth', field: 'wristGirthMm', kind: 'tour', mannequin: 'oui', how: 'coupe plane perpendiculaire à l\'axe de l\'avant-bras au poignet (armsMm.wrist)' },
}

const usage = {}
for (const [name, D] of Object.entries(DESIGNS)) {
  for (const m of D.patternConfig.measurements) (usage[m] ??= { required: [], optional: [] }).required.push(name)
  for (const m of D.patternConfig.optionalMeasurements) (usage[m] ??= { required: [], optional: [] }).optional.push(name)
}
const union = Object.keys(usage).filter((m) => usage[m].required.length > 0).sort()
const optionalOnly = Object.keys(usage).filter((m) => usage[m].required.length === 0)
const missingMeta = union.filter((m) => !META[m])
const extraMeta = Object.keys(META).filter((m) => !union.includes(m))
if (missingMeta.length || extraMeta.length) throw new Error(`métadonnées : manque ${missingMeta} ; en trop ${extraMeta}`)
const notUsed = ALL.filter((m) => !usage[m])
const table = union.map((m) => ({ name: m, unit: degreeMeasurements.includes(m) ? 'degrés' : 'mm', requiredBy: usage[m].required, optionalIn: usage[m].optional, ...META[m] }))
const kinds = {}
for (const r of table) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1
const mq = {}
for (const r of table) mq[r.mannequin] = (mq[r.mannequin] ?? 0) + 1
const out = {
  freesewingMeasurementsTotal: ALL.length,
  requiredUnion: union.length,
  optionalOnly,
  notUsedByTheSixModels: notUsed,
  derivedByPlugin: ['seatFront', 'seatBackArc', 'seatFrontArc', 'waistFront', 'waistBackArc', 'waistFrontArc', 'crossSeamBack'],
  byKind: kinds,
  byMannequin: mq,
  table,
}
writeFileSync('out/mesures.json', JSON.stringify(out, null, 1))
console.log(`union requise : ${union.length} sur ${ALL.length} ; non requises par les six modèles : ${notUsed.join(', ')}`)
console.log('par nature :', JSON.stringify(kinds), '; mannequin :', JSON.stringify(mq))
for (const r of table) console.log(`${r.name.padEnd(19)} ${r.unit.padEnd(6)} ${r.kind.padEnd(8)} ${r.mannequin.padEnd(7)} req: ${r.requiredBy.join(',')}${r.optionalIn.length ? ' (opt: ' + r.optionalIn.join(',') + ')' : ''}`)
