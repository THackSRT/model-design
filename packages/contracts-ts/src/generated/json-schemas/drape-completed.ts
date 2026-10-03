// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « drapeCompleted ». */
export const drapeCompletedJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/events/drape-completed.schema.json',
  title: 'DrapeCompleted',
  description:
    "Données de l'événement drape.completed : le drapé drapeId est calculé. Aucune mesure, aucun texte libre.",
  type: 'object',
  additionalProperties: false,
  required: ['drapeId', 'designId', 'versionNumber', 'organizationId', 'result'],
  properties: {
    drapeId: { type: 'string', format: 'uuid' },
    designId: { type: 'string', format: 'uuid' },
    versionNumber: { type: 'integer', minimum: 1 },
    organizationId: { type: 'string', format: 'uuid' },
    result: { $ref: '../drape/drape-result.schema.json' },
  },
} as const;
