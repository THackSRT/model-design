// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « designVersionPage ». */
export const designVersionPageJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/design-version-page.schema.json',
  title: 'DesignVersionPage',
  description:
    "Une page de résumés de versions d'un modèle, par numéro décroissant (la plus récente d'abord).",
  type: 'object',
  additionalProperties: false,
  required: ['designId', 'items'],
  properties: {
    designId: { type: 'string', format: 'uuid' },
    items: {
      type: 'array',
      maxItems: 100,
      items: { $ref: './design-version-summary.schema.json' },
    },
    nextCursor: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      description:
        'Curseur opaque de la page suivante (versions plus anciennes). Absent : dernière page.',
    },
  },
} as const;
