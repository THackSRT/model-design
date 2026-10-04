// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « measurementSet ». */
export const measurementSetJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/measurement-set.schema.json',
  title: 'MeasurementSet',
  description:
    "Mesures du corps d'un client (ISO 8559-1, complétées des mesures de FreeSewing qu'elle n'a pas), en millimètres entiers (suffixe Mm) ; la pente d'épaule en degrés entiers (suffixe Deg). Données personnelles sensibles : jamais journalisées. Une mesure facultative absente est estimée par le moteur (patronage, tracé ou mannequin) ; le patronage la liste dans GarmentSpec.estimatedMeasurements. Correspondance avec les noms FreeSewing : docs/composants/contrats.md.",
  type: 'object',
  additionalProperties: false,
  required: ['sex', 'statureMm', 'chestGirthMm', 'waistGirthMm', 'hipGirthMm'],
  properties: {
    sex: { type: 'string', enum: ['female', 'male'] },
    statureMm: { type: 'integer', minimum: 900, maximum: 2300 },
    neckGirthMm: { type: 'integer', minimum: 250, maximum: 600 },
    chestGirthMm: { type: 'integer', minimum: 500, maximum: 1800 },
    waistGirthMm: { type: 'integer', minimum: 400, maximum: 1800 },
    hipGirthMm: { type: 'integer', minimum: 600, maximum: 1900 },
    upperArmGirthMm: { type: 'integer', minimum: 150, maximum: 600 },
    wristGirthMm: { type: 'integer', minimum: 110, maximum: 260 },
    thighGirthMm: { type: 'integer', minimum: 300, maximum: 1000 },
    kneeGirthMm: { type: 'integer', minimum: 250, maximum: 600 },
    calfGirthMm: { type: 'integer', minimum: 220, maximum: 600 },
    ankleGirthMm: { type: 'integer', minimum: 170, maximum: 400 },
    crotchHeightMm: { type: 'integer', minimum: 400, maximum: 1100 },
    bustGirthMm: {
      type: 'integer',
      description: 'Tour de poitrine sur les pointes de seins (ISO 8559-1 : bust girth).',
      minimum: 600,
      maximum: 1800,
    },
    underBustGirthMm: {
      type: 'integer',
      description: 'Tour de dessous de poitrine (ISO 8559-1 : underbust girth).',
      minimum: 500,
      maximum: 1700,
    },
    cervicaleHeightMm: {
      type: 'integer',
      description:
        'Hauteur de la vertèbre cervicale saillante depuis le sol (ISO 8559-1 : cervicale height).',
      minimum: 700,
      maximum: 2000,
    },
    waistHeightMm: {
      type: 'integer',
      description: 'Hauteur de la taille depuis le sol (ISO 8559-1 : waist height).',
      minimum: 500,
      maximum: 1400,
    },
    hipHeightMm: {
      type: 'integer',
      description:
        'Hauteur des hanches (tour le plus fort) depuis le sol (ISO 8559-1 : hip height).',
      minimum: 400,
      maximum: 1200,
    },
    backWaistLengthMm: {
      type: 'integer',
      description:
        'Longueur taille dos : de la cervicale à la taille, le long de la colonne (ISO 8559-1 : back waist length).',
      minimum: 300,
      maximum: 600,
    },
    frontWaistLengthMm: {
      type: 'integer',
      description:
        "Longueur taille devant : du point d'encolure à l'épaule à la taille, par la pointe de sein (ISO 8559-1 : front waist length).",
      minimum: 300,
      maximum: 700,
    },
    neckShoulderToBustPointMm: {
      type: 'integer',
      description:
        "Du point d'encolure à l'épaule à la pointe de sein (ISO 8559-1 : neck shoulder point to bust point).",
      minimum: 150,
      maximum: 450,
    },
    bustPointWidthMm: {
      type: 'integer',
      description: 'Écart entre les pointes de seins (ISO 8559-1 : bust point width).',
      minimum: 100,
      maximum: 300,
    },
    shoulderWidthMm: {
      type: 'integer',
      description:
        "Carrure d'épaule à épaule, d'un point d'épaule à l'autre, par le dos (ISO 8559-1 : shoulder width).",
      minimum: 250,
      maximum: 550,
    },
    armscyeDepthMm: {
      type: 'integer',
      description:
        "Profondeur d'emmanchure : de la ligne d'épaule au niveau du dessous de bras (ISO 8559-1 : armscye depth).",
      minimum: 100,
      maximum: 300,
    },
    armLengthMm: {
      type: 'integer',
      description:
        "Longueur de bras : du point d'épaule au poignet, coude légèrement plié (ISO 8559-1 : arm length).",
      minimum: 400,
      maximum: 900,
    },
    upperHipGirthMm: {
      type: 'integer',
      description:
        'Tour de hanches hautes, horizontal, à la hauteur du sommet des crêtes iliaques, entre la taille et le tour de bassin (FreeSewing : hips). Distinct de hipGirthMm, le tour le plus fort (FreeSewing : seat).',
      minimum: 500,
      maximum: 1900,
    },
    waistGirthBackMm: {
      type: 'integer',
      description:
        "Part dos du tour de taille : d'un point de côté à l'autre en passant par le dos, le long du corps (FreeSewing : waistBack ; son waistBackArc en est la moitié).",
      minimum: 200,
      maximum: 1000,
    },
    hipGirthBackMm: {
      type: 'integer',
      description:
        "Part dos du tour de bassin (hipGirthMm) : d'un point de côté à l'autre en passant par le dos, le long du corps (FreeSewing : seatBack ; son seatBackArc en est la moitié).",
      minimum: 300,
      maximum: 1100,
    },
    shoulderSlopeDeg: {
      type: 'integer',
      description:
        "Pente d'épaule, en degrés sous l'horizontale : angle de la droite qui va du point d'encolure à l'épaule (côté du cou) au point d'épaule, vue de face (FreeSewing : shoulderSlope).",
      minimum: 0,
      maximum: 45,
    },
    waistToArmpitMm: {
      type: 'integer',
      description:
        "De la taille au creux de l'aisselle, verticalement, sur le côté du corps (FreeSewing : waistToArmpit).",
      minimum: 80,
      maximum: 450,
    },
    waistToUpperHipMm: {
      type: 'integer',
      description:
        'De la taille au niveau des hanches hautes (upperHipGirthMm), verticalement, sur le côté du corps (FreeSewing : waistToHips).',
      minimum: 20,
      maximum: 300,
    },
    crotchLengthMm: {
      type: 'integer',
      description:
        "Longueur de fourche (montant total) : de la taille au milieu devant, entre les jambes, jusqu'à la taille au milieu dos, le long du corps (ISO 8559-1 : crotch length ; FreeSewing : crossSeam).",
      minimum: 400,
      maximum: 1500,
    },
    frontCrotchLengthMm: {
      type: 'integer',
      description:
        "Part devant de la longueur de fourche : de la taille au milieu devant jusqu'au point de fourche, le plus bas du tronc entre les jambes, le long du corps ; la part dos vaut crotchLengthMm moins cette mesure (FreeSewing : crossSeamFront).",
      minimum: 150,
      maximum: 750,
    },
    waistToThighMm: {
      type: 'integer',
      description:
        "De la taille au niveau du tour de cuisse (thighGirthMm, juste sous l'entrejambe), verticalement, sur le côté du corps (FreeSewing : waistToUpperLeg).",
      minimum: 100,
      maximum: 600,
    },
    highBustGirthMm: {
      type: 'integer',
      description:
        'Tour de poitrine haute, horizontal, sous les bras et au-dessus de la poitrine (FreeSewing : highBust).',
      minimum: 500,
      maximum: 1800,
    },
    kneeHeightMm: {
      type: 'integer',
      description:
        'Hauteur du genou depuis le sol, verticalement (ISO 8559-1 : knee height). Le waistToKnee de FreeSewing vaut waistHeightMm moins cette hauteur.',
      minimum: 200,
      maximum: 700,
    },
  },
} as const;
