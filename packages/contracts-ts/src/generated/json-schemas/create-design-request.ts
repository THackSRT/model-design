// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « createDesignRequest ». */
export const createDesignRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/create-design-request.schema.json',
  title: 'CreateDesignRequest',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'garmentType'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    garmentType: { $ref: '../garment-type.schema.json' },
  },
} as const;
