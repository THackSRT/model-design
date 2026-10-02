// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « cuttingPlan ». */
export const cuttingPlanJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/cutting-plan.schema.json',
  title: 'CuttingPlan',
  description:
    'Plan de coupe : placement des pièces sur la laize, métrage et efficience. Repère du plan en millimètres : x le long du tissu (droit fil), de 0 à fabricLengthMm ; y en travers, de 0 à usableWidthMm, y = 0 sur la pliure (folded) ou à la marge de la lisière (single).',
  type: 'object',
  additionalProperties: false,
  required: [
    'unit',
    'engine',
    'fabricWidthMm',
    'usableWidthMm',
    'layout',
    'direction',
    'fabricLengthMm',
    'efficiency',
    'pieceCount',
    'surplusPieceCount',
    'placements',
  ],
  properties: {
    unit: {
      const: 'mm',
    },
    engine: {
      $ref: './cut-pattern.schema.json#/$defs/EngineRef',
    },
    fabricWidthMm: {
      type: 'integer',
      minimum: 300,
    },
    usableWidthMm: {
      type: 'number',
      description:
        "Largeur où l'on place les pièces : laize moins les marges de lisière, divisée par deux si le tissu est plié.",
      minimum: 0,
    },
    layout: {
      type: 'string',
      enum: ['single', 'folded'],
    },
    direction: {
      type: 'string',
      enum: ['one-way', 'two-way'],
    },
    fabricLengthMm: {
      type: 'integer',
      description: 'Métrage : longueur de tissu à couper, arrondie au millimètre supérieur.',
      minimum: 0,
    },
    efficiency: {
      type: 'number',
      description:
        "Aire des pièces placées divisée par l'aire utilisée (usableWidthMm × fabricLengthMm), de 0 à 1, arrondie à 4 décimales.",
      minimum: 0,
      maximum: 1,
    },
    pieceCount: {
      type: 'integer',
      description: 'Nombre de pièces obtenues à la coupe.',
      minimum: 0,
    },
    surplusPieceCount: {
      type: 'integer',
      description: 'Pièces coupées en trop (quantité impaire sur tissu plié).',
      minimum: 0,
    },
    placements: {
      type: 'array',
      items: {
        $ref: '#/$defs/Placement',
      },
    },
  },
  $defs: {
    Placement: {
      type: 'object',
      additionalProperties: false,
      required: [
        'garmentLabel',
        'panelId',
        'copy',
        'plies',
        'rotationDeg',
        'mirrored',
        'onFold',
        'outline',
      ],
      properties: {
        garmentLabel: {
          $ref: './size-label.schema.json',
        },
        panelId: {
          type: 'string',
        },
        copy: {
          type: 'integer',
          description: 'Numéro de placement de cette pièce pour ce vêtement (à partir de 1).',
          minimum: 1,
        },
        plies: {
          type: 'integer',
          description:
            'Pièces obtenues par ce placement : 2 sur tissu plié, 1 sinon ou pour une pièce sur pliure.',
          minimum: 1,
          maximum: 2,
        },
        rotationDeg: {
          type: 'number',
          description:
            'Rotation appliquée à la pièce (repère de GarmentSpec) pour aligner son droit fil sur x, plus 180° si la pièce est retournée.',
          minimum: 0,
          exclusiveMaximum: 360,
        },
        mirrored: {
          type: 'boolean',
          description:
            'Vrai : la pièce est placée en symétrique (paire gauche / droite sur tissu à plat).',
        },
        onFold: {
          type: 'boolean',
          description:
            'Vrai : le bord de pliure de la pièce est posé sur la pliure du tissu (y = 0).',
        },
        outline: {
          type: 'array',
          description:
            'Ligne de coupe placée, dans le repère du plan (dépliée si la pièce sur pliure est coupée à plat).',
          minItems: 3,
          items: {
            $ref: '../garment-spec.schema.json#/$defs/Point',
          },
        },
      },
    },
  },
} as const;
