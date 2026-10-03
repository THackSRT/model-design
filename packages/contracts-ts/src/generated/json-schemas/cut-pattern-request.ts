// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « cutPatternRequest ». */
export const cutPatternRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/cut-pattern-request.schema.json',
  title: 'CutPatternRequest',
  description: 'Demande de pièces de coupe : une spécification de patron et la façon de la finir.',
  type: 'object',
  additionalProperties: false,
  required: ['spec'],
  properties: {
    spec: {
      $ref: '../garment-spec.schema.json',
    },
    finishing: {
      $ref: './finishing-options.schema.json',
    },
    sizeLabel: {
      $ref: './size-label.schema.json',
    },
  },
} as const;
