// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « designExportRequest ». */
export const designExportRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/design-export-request.schema.json',
  title: 'DesignExportRequest',
  description:
    "Demande d'export des pièces de coupe d'une version de modèle, à l'échelle 1:1. La spécification de patron est celle de la version : le client ne l'envoie pas. La réponse est le fichier lui-même.",
  type: 'object',
  additionalProperties: false,
  required: ['format'],
  properties: {
    format: { $ref: '../manufacturing/export-request.schema.json#/$defs/ExportFormat' },
    finishing: { $ref: '../manufacturing/finishing-options.schema.json' },
    sizeLabel: {
      $ref: '../manufacturing/size-label.schema.json',
      description:
        'Taille écrite sur chaque pièce et dans le nom du fichier. Jamais de nom de client.',
    },
    reference: {
      $ref: '../manufacturing/size-label.schema.json',
      description:
        'Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client.',
    },
  },
} as const;
