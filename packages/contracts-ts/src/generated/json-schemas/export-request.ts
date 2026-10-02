// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « exportRequest ». */
export const exportRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/export-request.schema.json',
  title: 'ExportRequest',
  description:
    "Demande d'export des pièces de coupe d'un patron, à l'échelle 1:1. La réponse est le fichier lui-même (SVG, PDF ou DXF).",
  type: 'object',
  additionalProperties: false,
  required: ['format', 'spec'],
  properties: {
    format: {
      $ref: '#/$defs/ExportFormat',
    },
    spec: {
      $ref: '../garment-spec.schema.json',
    },
    finishing: {
      $ref: './finishing-options.schema.json',
    },
    sizeLabel: {
      $ref: './size-label.schema.json',
    },
    reference: {
      $ref: './size-label.schema.json',
      description:
        'Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client.',
    },
    locale: {
      type: 'string',
      description: 'Langue des annotations (droit fil, pliure, « couper 2 × »).',
      enum: ['fr'],
      default: 'fr',
    },
  },
  $defs: {
    ExportFormat: {
      type: 'string',
      description:
        "svg : une planche à l'échelle 1:1 (unités mm). pdf-a4-tiled : la même planche découpée en pages A4 à assembler, précédées d'un plan d'assemblage avec un carré de contrôle de 100 mm. dxf-aama : DXF R12 selon AAMA-DXF (ASTM D6673), une taille, pour les logiciels de CAO et les tables de coupe.",
      enum: ['svg', 'pdf-a4-tiled', 'dxf-aama'],
    },
  },
} as const;
