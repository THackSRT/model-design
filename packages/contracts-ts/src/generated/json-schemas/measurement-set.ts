// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « measurementSet ». */
export const measurementSetJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/measurement-set.schema.json',
  title: 'MeasurementSet',
  description:
    "Mesures du corps d'un client (ISO 8559-1), en millimètres entiers. Une mesure facultative absente est estimée par le moteur de patronage, qui la liste dans GarmentSpec.estimatedMeasurements.",
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
  },
} as const;
