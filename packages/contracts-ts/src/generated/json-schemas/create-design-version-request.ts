// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « createDesignVersionRequest ». */
export const createDesignVersionRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/create-design-version-request.schema.json',
  title: 'CreateDesignVersionRequest',
  type: 'object',
  additionalProperties: false,
  required: ['measurements', 'garment'],
  properties: {
    measurements: { $ref: '../measurement-set.schema.json' },
    garment: { $ref: '../garment-request.schema.json' },
  },
} as const;
