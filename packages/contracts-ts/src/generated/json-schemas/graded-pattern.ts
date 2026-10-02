// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « gradedPattern ». */
export const gradedPatternJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/graded-pattern.schema.json',
  title: 'GradedPattern',
  description:
    'Patron gradué : les pièces de coupe de chaque taille, alignées, et les écarts de gradation de chaque sommet de la ligne de couture par rapport à la taille de base. Millimètres.',
  type: 'object',
  additionalProperties: false,
  required: ['unit', 'engine', 'baseSize', 'sizes', 'gradeRules'],
  properties: {
    unit: {
      const: 'mm',
    },
    engine: {
      $ref: './cut-pattern.schema.json#/$defs/EngineRef',
    },
    baseSize: {
      $ref: './size-label.schema.json',
    },
    sizes: {
      type: 'array',
      description: "Dans l'ordre de la demande.",
      minItems: 2,
      items: {
        $ref: '#/$defs/SizedCutPattern',
      },
    },
    gradeRules: {
      type: 'array',
      description: "Une entrée par pièce, dans l'ordre des pièces.",
      items: {
        $ref: '#/$defs/PanelGradeRule',
      },
    },
  },
  $defs: {
    SizedCutPattern: {
      type: 'object',
      additionalProperties: false,
      required: ['size', 'pieces'],
      properties: {
        size: {
          $ref: './size-label.schema.json',
        },
        pieces: {
          type: 'array',
          minItems: 1,
          items: {
            $ref: './cut-pattern.schema.json#/$defs/CutPiece',
          },
        },
      },
    },
    PanelGradeRule: {
      type: 'object',
      additionalProperties: false,
      required: ['panelId', 'vertices'],
      properties: {
        panelId: {
          type: 'string',
        },
        vertices: {
          type: 'array',
          description:
            'Un sommet par bord : le début (from) du bord edgeId, sur la ligne de couture.',
          items: {
            $ref: '#/$defs/VertexGradeRule',
          },
        },
      },
    },
    VertexGradeRule: {
      type: 'object',
      additionalProperties: false,
      required: ['edgeId', 'deltas'],
      properties: {
        edgeId: {
          type: 'string',
        },
        deltas: {
          type: 'array',
          description:
            "Écart de ce sommet pour chaque taille par rapport à la taille de base (0 pour la base), dans l'ordre des tailles.",
          items: {
            $ref: '#/$defs/SizeDelta',
          },
        },
      },
    },
    SizeDelta: {
      type: 'object',
      additionalProperties: false,
      required: ['size', 'dxMm', 'dyMm'],
      properties: {
        size: {
          $ref: './size-label.schema.json',
        },
        dxMm: {
          type: 'number',
        },
        dyMm: {
          type: 'number',
        },
      },
    },
  },
} as const;
