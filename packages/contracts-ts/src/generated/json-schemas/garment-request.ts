// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « garmentRequest ». */
export const garmentRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/garment-request.schema.json',
  title: 'GarmentRequest',
  description:
    "Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres, qui dépendent du type. Longueurs en millimètres.",
  oneOf: [
    { $ref: '#/$defs/StraightSkirtRequest' },
    { $ref: '#/$defs/CircleSkirtRequest' },
    { $ref: '#/$defs/TrousersRequest' },
    { $ref: '#/$defs/BodiceRequest' },
  ],
  $defs: {
    StraightSkirtRequest: {
      type: 'object',
      description: 'Jupe droite à pinces.',
      additionalProperties: false,
      required: ['type', 'params'],
      properties: {
        type: { type: 'string', const: 'straight-skirt' },
        params: { $ref: '#/$defs/StraightSkirtParams' },
      },
    },
    CircleSkirtRequest: {
      type: 'object',
      description: 'Jupe cercle (ou fraction de cercle).',
      additionalProperties: false,
      required: ['type', 'params'],
      properties: {
        type: { type: 'string', const: 'circle-skirt' },
        params: { $ref: '#/$defs/CircleSkirtParams' },
      },
    },
    TrousersRequest: {
      type: 'object',
      description: 'Pantalon.',
      additionalProperties: false,
      required: ['type', 'params'],
      properties: {
        type: { type: 'string', const: 'trousers' },
        params: { $ref: '#/$defs/TrousersParams' },
      },
    },
    BodiceRequest: {
      type: 'object',
      description: 'Corsage, avec ou sans manches.',
      additionalProperties: false,
      required: ['type', 'params'],
      properties: {
        type: { type: 'string', const: 'bodice' },
        params: { $ref: '#/$defs/BodiceParams' },
      },
    },
    StraightSkirtParams: {
      type: 'object',
      additionalProperties: false,
      required: ['lengthMm'],
      properties: {
        lengthMm: { type: 'integer', minimum: 300, maximum: 1300 },
        waistEaseMm: { type: 'integer', minimum: 0, maximum: 80, default: 10 },
        hipEaseMm: { type: 'integer', minimum: 0, maximum: 200, default: 40 },
        hemFlareMm: { type: 'integer', minimum: 0, maximum: 200, default: 0 },
      },
    },
    CircleSkirtParams: {
      type: 'object',
      additionalProperties: false,
      required: ['lengthMm'],
      properties: {
        lengthMm: {
          type: 'integer',
          description: "De la taille à l'ourlet.",
          minimum: 300,
          maximum: 1300,
        },
        waistEaseMm: { type: 'integer', minimum: 0, maximum: 80, default: 10 },
        circleFraction: {
          type: 'number',
          description:
            "Fraction de cercle de l'ourlet : 1 pour un cercle entier, 0,5 pour un demi-cercle (suns de GarmentCode).",
          minimum: 0.25,
          maximum: 1,
          default: 1,
        },
        waistbandWidthMm: {
          description: 'Hauteur de la ceinture ; 0 : sans ceinture.',
          default: 0,
          anyOf: [
            { type: 'integer', const: 0 },
            { type: 'integer', minimum: 20, maximum: 80 },
          ],
        },
      },
    },
    TrousersParams: {
      type: 'object',
      additionalProperties: false,
      required: ['lengthMm'],
      properties: {
        lengthMm: {
          type: 'integer',
          description: "De la taille à l'ourlet, sur le côté.",
          minimum: 300,
          maximum: 1300,
        },
        waistEaseMm: { type: 'integer', minimum: 0, maximum: 80, default: 10 },
        hipEaseMm: { type: 'integer', minimum: 20, maximum: 200, default: 50 },
        hemGirthMm: {
          type: 'integer',
          description: 'Tour du bas de jambe. Absent : jambe droite depuis le genou.',
          minimum: 250,
          maximum: 900,
        },
      },
    },
    BodiceParams: {
      type: 'object',
      additionalProperties: false,
      properties: {
        lengthBelowWaistMm: {
          type: 'integer',
          description: 'Longueur sous la taille ; 0 : arrêt à la taille.',
          minimum: 0,
          maximum: 400,
          default: 0,
        },
        bustEaseMm: { type: 'integer', minimum: 0, maximum: 200, default: 60 },
        waistEaseMm: { type: 'integer', minimum: 0, maximum: 200, default: 40 },
        frontNeckDepthMm: {
          type: 'integer',
          description:
            "Creusement de l'encolure devant sous l'encolure naturelle ; 0 : encolure naturelle.",
          minimum: 0,
          maximum: 250,
          default: 0,
        },
        backNeckDepthMm: {
          type: 'integer',
          description:
            "Creusement de l'encolure dos sous l'encolure naturelle ; 0 : encolure naturelle.",
          minimum: 0,
          maximum: 250,
          default: 0,
        },
        sleeve: {
          $ref: '#/$defs/SleeveParams',
          description: 'Manches. Absent : sans manches.',
        },
      },
    },
    SleeveParams: {
      type: 'object',
      additionalProperties: false,
      required: ['lengthMm'],
      properties: {
        lengthMm: {
          type: 'integer',
          description: "Du point d'épaule à l'ourlet.",
          minimum: 100,
          maximum: 900,
        },
        capEaseMm: {
          type: 'integer',
          description:
            "Embu de la tête de manche : la tête est plus longue que l'emmanchure de cette valeur.",
          minimum: 0,
          maximum: 40,
          default: 15,
        },
        hemGirthMm: {
          type: 'integer',
          description: 'Tour du bas de manche. Absent : valeur choisie par le tracé.',
          minimum: 150,
          maximum: 600,
        },
      },
    },
  },
} as const;
