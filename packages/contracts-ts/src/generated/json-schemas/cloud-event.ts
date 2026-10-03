// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « cloudEvent ». */
export const cloudEventJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/events/cloud-event.schema.json',
  title: 'CloudEventEnvelope',
  description: 'Enveloppe CloudEvents 1.0 de tous les événements de la plateforme.',
  type: 'object',
  required: ['specversion', 'id', 'source', 'type', 'time', 'datacontenttype', 'data'],
  properties: {
    specversion: { const: '1.0' },
    id: { type: 'string', format: 'uuid' },
    source: { type: 'string', description: 'Service éditeur, ex. /services/designs' },
    type: { type: 'string', pattern: '^[a-z-]+\\.[a-z_]+(\\.v[0-9]+)?$' },
    subject: { type: 'string' },
    time: { type: 'string', format: 'date-time' },
    datacontenttype: { const: 'application/json' },
    data: { type: 'object' },
  },
} as const;
