// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schémas JSON bruts, pour la validation à l'exécution (Ajv). */
export const jsonSchemas = {
  createDesignRequest: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/designs/create-design-request.schema.json',
    title: 'CreateDesignRequest',
    type: 'object',
    additionalProperties: false,
    required: ['name', 'garmentType'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 120 },
      garmentType: { type: 'string', enum: ['straight-skirt'] },
    },
  },
  createDesignVersionRequest: {
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
  },
  designVersion: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/designs/design-version.schema.json',
    title: 'DesignVersion',
    type: 'object',
    additionalProperties: false,
    required: ['designId', 'number', 'createdAt', 'measurements', 'garment', 'fingerprint', 'spec'],
    properties: {
      designId: { type: 'string', format: 'uuid' },
      number: { type: 'integer', minimum: 1 },
      createdAt: { type: 'string', format: 'date-time' },
      measurements: { $ref: '../measurement-set.schema.json' },
      garment: { $ref: '../garment-request.schema.json' },
      fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      spec: { $ref: '../garment-spec.schema.json' },
    },
  },
  design: {
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
      garmentType: { type: 'string', enum: ['straight-skirt'] },
      createdAt: { type: 'string', format: 'date-time' },
      latestVersionNumber: {
        type: 'integer',
        minimum: 0,
        description: "0 tant qu'aucune version n'existe.",
      },
    },
  },
  cloudEvent: {
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
  },
  designVersioned: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/events/design-versioned.schema.json',
    title: 'DesignVersioned',
    description:
      "Données de l'événement design.versioned : une nouvelle version d'un modèle existe, avec son patron.",
    type: 'object',
    additionalProperties: false,
    required: ['designId', 'versionNumber', 'organizationId', 'fingerprint', 'engineVersion'],
    properties: {
      designId: { type: 'string', format: 'uuid' },
      versionNumber: { type: 'integer', minimum: 1 },
      organizationId: { type: 'string', format: 'uuid' },
      fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      engineVersion: { type: 'string' },
    },
  },
  garmentRequest: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/garment-request.schema.json',
    title: 'GarmentRequest',
    description:
      "Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres.",
    type: 'object',
    additionalProperties: false,
    required: ['type', 'params'],
    properties: {
      type: { type: 'string', enum: ['straight-skirt'] },
      params: { $ref: '#/$defs/StraightSkirtParams' },
    },
    $defs: {
      StraightSkirtParams: {
        type: 'object',
        additionalProperties: false,
        required: ['lengthMm'],
        properties: {
          lengthMm: { type: 'integer', minimum: 300, maximum: 1300 },
          waistEaseMm: { type: 'integer', minimum: 0, maximum: 80, default: 10 },
          hipEaseMm: { type: 'integer', minimum: 0, maximum: 200, default: 40 },
          hemFlareMm: { type: 'integer', minimum: 0, maximum: 200, default: 0 },
        },
      },
    },
  },
  garmentSpec: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/garment-spec.schema.json',
    title: 'GarmentSpec',
    description:
      'Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat.',
    type: 'object',
    additionalProperties: false,
    required: ['specVersion', 'unit', 'engine', 'garment', 'panels', 'seams'],
    properties: {
      specVersion: {
        const: '1.0',
      },
      unit: {
        const: 'mm',
      },
      engine: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'version'],
        properties: {
          name: {
            type: 'string',
          },
          version: {
            type: 'string',
          },
        },
      },
      garment: {
        type: 'object',
        additionalProperties: false,
        required: ['type'],
        properties: {
          type: {
            type: 'string',
          },
        },
      },
      panels: {
        type: 'array',
        minItems: 1,
        items: {
          $ref: '#/$defs/Panel',
        },
      },
      seams: {
        type: 'array',
        items: {
          $ref: '#/$defs/Seam',
        },
      },
    },
    $defs: {
      Point: {
        type: 'array',
        description: '[x, y] en millimètres.',
        items: {
          type: 'number',
        },
        minItems: 2,
        maxItems: 2,
      },
      Edge: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'from', 'to'],
        properties: {
          id: {
            type: 'string',
          },
          from: {
            $ref: '#/$defs/Point',
          },
          to: {
            $ref: '#/$defs/Point',
          },
          controls: {
            type: 'array',
            description:
              "Points de contrôle d'une courbe de Bézier (1 : quadratique, 2 : cubique). Absent : segment droit.",
            items: {
              $ref: '#/$defs/Point',
            },
            maxItems: 2,
          },
          role: {
            type: 'string',
            enum: ['seam', 'fold', 'hem', 'waistline', 'opening'],
          },
        },
      },
      Panel: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'edges', 'quantity'],
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          edges: {
            type: 'array',
            description:
              'Contour fermé, dans le sens trigonométrique : la fin de chaque bord est le début du suivant.',
            minItems: 3,
            items: {
              $ref: '#/$defs/Edge',
            },
          },
          grainline: {
            type: 'array',
            description: 'Droit fil : deux points.',
            items: {
              $ref: '#/$defs/Point',
            },
            minItems: 2,
            maxItems: 2,
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Nombre de pièces à couper.',
          },
          cutOnFold: {
            type: 'boolean',
            default: false,
          },
        },
      },
      EdgeRef: {
        type: 'object',
        additionalProperties: false,
        required: ['panelId', 'edgeId'],
        properties: {
          panelId: {
            type: 'string',
          },
          edgeId: {
            type: 'string',
          },
        },
      },
      Seam: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'a', 'b'],
        properties: {
          id: {
            type: 'string',
          },
          a: {
            $ref: '#/$defs/EdgeRef',
          },
          b: {
            $ref: '#/$defs/EdgeRef',
          },
        },
      },
    },
  },
  measurementSet: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/measurement-set.schema.json',
    title: 'MeasurementSet',
    description: "Mesures du corps d'un client (ISO 8559-1), en millimètres entiers.",
    type: 'object',
    additionalProperties: false,
    required: ['sex', 'statureMm', 'chestGirthMm', 'waistGirthMm', 'hipGirthMm'],
    properties: {
      sex: { type: 'string', enum: ['female', 'male'] },
      statureMm: { type: 'integer', minimum: 900, maximum: 2300 },
      neckGirthMm: { type: 'integer', minimum: 250, maximum: 600 },
      chestGirthMm: { type: 'integer', minimum: 500, maximum: 1800 },
      waistGirthMm: { type: 'integer', minimum: 400, maximum: 1800 },
      hipGirthMm: { type: 'integer', minimum: 600, maximum: 1900 },
      upperArmGirthMm: { type: 'integer', minimum: 150, maximum: 600 },
      wristGirthMm: { type: 'integer', minimum: 110, maximum: 260 },
      thighGirthMm: { type: 'integer', minimum: 300, maximum: 1000 },
      kneeGirthMm: { type: 'integer', minimum: 250, maximum: 600 },
      calfGirthMm: { type: 'integer', minimum: 220, maximum: 600 },
      ankleGirthMm: { type: 'integer', minimum: 170, maximum: 400 },
      crotchHeightMm: { type: 'integer', minimum: 400, maximum: 1100 },
    },
  },
} as const;
