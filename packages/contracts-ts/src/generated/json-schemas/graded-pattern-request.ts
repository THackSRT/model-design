// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « gradedPatternRequest ». */
export const gradedPatternRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/graded-pattern-request.schema.json',
  title: 'GradedPatternRequest',
  description:
    'Gradation par recalcul : une spécification par taille, toutes calculées par le moteur de patronage avec les mêmes pièces et les mêmes bords (mêmes identifiants, même ordre). Le moteur les finit, les aligne et en déduit les écarts de gradation par rapport à la taille de base.',
  type: 'object',
  additionalProperties: false,
  required: ['baseSize', 'sizes'],
  properties: {
    baseSize: {
      $ref: './size-label.schema.json',
      description: "Taille de base : l'une des tailles de sizes.",
    },
    sizes: {
      type: 'array',
      minItems: 2,
      maxItems: 12,
      items: {
        $ref: '#/$defs/SizedSpec',
      },
    },
    finishing: {
      $ref: './finishing-options.schema.json',
    },
    alignment: {
      type: 'string',
      description:
        "origin : pièces laissées dans leur repère (le moteur de patronage place le point de référence de gradation à l'origine). grainline : chaque pièce est translatée pour que le début de son droit fil coïncide avec celui de la taille de base.",
      enum: ['origin', 'grainline'],
      default: 'origin',
    },
  },
  $defs: {
    SizedSpec: {
      type: 'object',
      additionalProperties: false,
      required: ['size', 'spec'],
      properties: {
        size: {
          $ref: './size-label.schema.json',
        },
        spec: {
          $ref: '../garment-spec.schema.json',
        },
      },
    },
  },
} as const;
