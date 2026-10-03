// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « design ». */
export const designJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/design.schema.json',
  title: 'Design',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'organizationId', 'name', 'garmentType', 'createdAt', 'latestVersionNumber'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    garmentType: { $ref: '../garment-type.schema.json' },
    createdAt: { type: 'string', format: 'date-time' },
    latestVersionNumber: {
      type: 'integer',
      minimum: 0,
      description: "0 tant qu'aucune version n'existe.",
    },
  },
} as const;
