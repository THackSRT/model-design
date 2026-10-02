// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « fabric ». */
export const fabricJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric.schema.json',
  title: 'Fabric',
  description:
    "Tissu d'un drapé : un préréglage et des surcharges facultatives, chacune dans son unité (suffixe). Les valeurs des préréglages sont dans le moteur de drapé et sont des estimations, signalées par DrapeResult.fabricEstimated (ADR 0013).",
  type: 'object',
  additionalProperties: false,
  required: ['preset'],
  properties: {
    preset: {
      type: 'string',
      enum: ['cotton-poplin', 'cotton-wax', 'bazin', 'linen', 'denim', 'silk-satin', 'jersey'],
    },
    weightGPerM2: {
      type: 'number',
      description: 'Grammage, en grammes par mètre carré.',
      minimum: 20,
      maximum: 800,
    },
    thicknessMm: {
      type: 'number',
      description: 'Épaisseur, en millimètres.',
      minimum: 0.1,
      maximum: 5,
    },
    stretchWarpPercent: {
      type: 'number',
      description:
        'Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage.',
      minimum: 0,
      maximum: 100,
    },
    stretchWeftPercent: {
      type: 'number',
      description:
        'Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage.',
      minimum: 0,
      maximum: 100,
    },
    bendingRigidityMicroNm: {
      type: 'number',
      description:
        'Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m).',
      minimum: 0.1,
      maximum: 5000,
    },
    frictionCoefficient: {
      type: 'number',
      description: 'Coefficient de frottement du tissu sur le corps (sans unité).',
      minimum: 0,
      maximum: 1.5,
    },
  },
} as const;
