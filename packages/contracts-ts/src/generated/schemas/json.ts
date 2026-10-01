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
      garmentType: { $ref: '../garment-type.schema.json' },
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
      garmentType: { $ref: '../garment-type.schema.json' },
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
      "Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres, qui dépendent du type. Longueurs en millimètres.",
    oneOf: [
      { $ref: '#/$defs/StraightSkirtRequest' },
      { $ref: '#/$defs/CircleSkirtRequest' },
      { $ref: '#/$defs/TrousersRequest' },
      { $ref: '#/$defs/BodiceRequest' },
    ],
    $defs: {
      StraightSkirtRequest: {
        type: 'object',
        description: 'Jupe droite à pinces.',
        additionalProperties: false,
        required: ['type', 'params'],
        properties: {
          type: { type: 'string', const: 'straight-skirt' },
          params: { $ref: '#/$defs/StraightSkirtParams' },
        },
      },
      CircleSkirtRequest: {
        type: 'object',
        description: 'Jupe cercle (ou fraction de cercle).',
        additionalProperties: false,
        required: ['type', 'params'],
        properties: {
          type: { type: 'string', const: 'circle-skirt' },
          params: { $ref: '#/$defs/CircleSkirtParams' },
        },
      },
      TrousersRequest: {
        type: 'object',
        description: 'Pantalon.',
        additionalProperties: false,
        required: ['type', 'params'],
        properties: {
          type: { type: 'string', const: 'trousers' },
          params: { $ref: '#/$defs/TrousersParams' },
        },
      },
      BodiceRequest: {
        type: 'object',
        description: 'Corsage, avec ou sans manches.',
        additionalProperties: false,
        required: ['type', 'params'],
        properties: {
          type: { type: 'string', const: 'bodice' },
          params: { $ref: '#/$defs/BodiceParams' },
        },
      },
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
      CircleSkirtParams: {
        type: 'object',
        additionalProperties: false,
        required: ['lengthMm'],
        properties: {
          lengthMm: {
            type: 'integer',
            description: "De la taille à l'ourlet.",
            minimum: 300,
            maximum: 1300,
          },
          waistEaseMm: { type: 'integer', minimum: 0, maximum: 80, default: 10 },
          circleFraction: {
            type: 'number',
            description:
              "Fraction de cercle de l'ourlet : 1 pour un cercle entier, 0,5 pour un demi-cercle (suns de GarmentCode).",
            minimum: 0.25,
            maximum: 1,
            default: 1,
          },
          waistbandWidthMm: {
            description: 'Hauteur de la ceinture ; 0 : sans ceinture.',
            default: 0,
            anyOf: [
              { type: 'integer', const: 0 },
              { type: 'integer', minimum: 20, maximum: 80 },
            ],
          },
        },
      },
      TrousersParams: {
        type: 'object',
        additionalProperties: false,
        required: ['lengthMm'],
        properties: {
          lengthMm: {
            type: 'integer',
            description: "De la taille à l'ourlet, sur le côté.",
            minimum: 300,
            maximum: 1300,
          },
          waistEaseMm: { type: 'integer', minimum: 0, maximum: 80, default: 10 },
          hipEaseMm: { type: 'integer', minimum: 20, maximum: 200, default: 50 },
          hemGirthMm: {
            type: 'integer',
            description: 'Tour du bas de jambe. Absent : jambe droite depuis le genou.',
            minimum: 250,
            maximum: 900,
          },
        },
      },
      BodiceParams: {
        type: 'object',
        additionalProperties: false,
        properties: {
          lengthBelowWaistMm: {
            type: 'integer',
            description: 'Longueur sous la taille ; 0 : arrêt à la taille.',
            minimum: 0,
            maximum: 400,
            default: 0,
          },
          bustEaseMm: { type: 'integer', minimum: 0, maximum: 200, default: 60 },
          waistEaseMm: { type: 'integer', minimum: 0, maximum: 200, default: 40 },
          frontNeckDepthMm: {
            type: 'integer',
            description:
              "Creusement de l'encolure devant sous l'encolure naturelle ; 0 : encolure naturelle.",
            minimum: 0,
            maximum: 250,
            default: 0,
          },
          backNeckDepthMm: {
            type: 'integer',
            description:
              "Creusement de l'encolure dos sous l'encolure naturelle ; 0 : encolure naturelle.",
            minimum: 0,
            maximum: 250,
            default: 0,
          },
          sleeve: {
            $ref: '#/$defs/SleeveParams',
            description: 'Manches. Absent : sans manches.',
          },
        },
      },
      SleeveParams: {
        type: 'object',
        additionalProperties: false,
        required: ['lengthMm'],
        properties: {
          lengthMm: {
            type: 'integer',
            description: "Du point d'épaule à l'ourlet.",
            minimum: 100,
            maximum: 900,
          },
          capEaseMm: {
            type: 'integer',
            description:
              "Embu de la tête de manche : la tête est plus longue que l'emmanchure de cette valeur.",
            minimum: 0,
            maximum: 40,
            default: 15,
          },
          hemGirthMm: {
            type: 'integer',
            description: 'Tour du bas de manche. Absent : valeur choisie par le tracé.',
            minimum: 150,
            maximum: 600,
          },
        },
      },
    },
  },
  garmentSpec: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/garment-spec.schema.json',
    title: 'GarmentSpec',
    description:
      'Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat, vues côté endroit du tissu, contour dans le sens trigonométrique.',
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
      estimatedMeasurements: {
        type: 'array',
        description:
          'Mesures absentes de la demande, estimées par le moteur : noms de champs de MeasurementSet (ex. bustGirthMm). Absent ou vide : aucune estimation.',
        uniqueItems: true,
        items: {
          type: 'string',
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
          notches: {
            type: 'array',
            description:
              'Crans posés par le moteur de patronage (tête de manche, ligne des hanches, milieux).',
            maxItems: 200,
            items: {
              $ref: '#/$defs/Notch',
            },
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
          easeMm: {
            type: 'number',
            description:
              'Embu : le bord a est plus long que le bord b de cette valeur, qui se répartit en le cousant sur b (ex. tête de manche). Absent : 0, les deux bords ont la même longueur.',
            minimum: 0,
            maximum: 50,
          },
        },
      },
      NotchPlacement: {
        type: 'object',
        description:
          "Emplacement d'un cran, seule définition partagée par Panel.notches (Notch) et la fabrication (NotchRequest) : sur la ligne de couture du bord edgeId, à distanceMm de son début (from), mesurée le long du bord. Ouvert pour être étendu (allOf) ; Notch et NotchRequest le ferment.",
        required: ['edgeId', 'distanceMm'],
        properties: {
          edgeId: {
            type: 'string',
          },
          distanceMm: {
            type: 'number',
            minimum: 0,
            maximum: 10000,
          },
          count: {
            type: 'integer',
            description: 'Cran simple, double (dos, par convention) ou triple.',
            minimum: 1,
            maximum: 3,
            default: 1,
          },
        },
      },
      Notch: {
        type: 'object',
        description: "Cran d'une pièce : un emplacement (NotchPlacement) sur un de ses bords.",
        allOf: [
          {
            $ref: '#/$defs/NotchPlacement',
          },
        ],
        unevaluatedProperties: false,
      },
    },
  },
  garmentType: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/garment-type.schema.json',
    title: 'GarmentType',
    description:
      "Type de vêtement connu de la plateforme (ADR 0010). Même valeur que GarmentRequest.type. Un type dont le tracé n'est pas encore livré est refusé par le moteur de patronage (problème garment-type-not-supported).",
    type: 'string',
    enum: ['straight-skirt', 'circle-skirt', 'trousers', 'bodice'],
  },
  cutPatternRequest: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/cut-pattern-request.schema.json',
    title: 'CutPatternRequest',
    description:
      'Demande de pièces de coupe : une spécification de patron et la façon de la finir.',
    type: 'object',
    additionalProperties: false,
    required: ['spec'],
    properties: {
      spec: {
        $ref: '../garment-spec.schema.json',
      },
      finishing: {
        $ref: './finishing-options.schema.json',
      },
      sizeLabel: {
        $ref: './size-label.schema.json',
      },
    },
  },
  cutPattern: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/cut-pattern.schema.json',
    title: 'CutPattern',
    description:
      'Pièces de coupe : chaque pièce du patron avec sa ligne de couture, sa ligne de coupe (valeurs de couture ajoutées), ses crans, son droit fil et sa pliure. Coordonnées en millimètres dans le repère de la pièce de GarmentSpec (y vers le haut), arrondies à 0,01 mm.',
    type: 'object',
    additionalProperties: false,
    required: ['unit', 'engine', 'specEngine', 'garment', 'pieces'],
    properties: {
      unit: {
        const: 'mm',
      },
      engine: {
        $ref: '#/$defs/EngineRef',
      },
      specEngine: {
        $ref: '#/$defs/EngineRef',
        description: "Moteur qui a calculé la spécification d'entrée (GarmentSpec.engine).",
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
      sizeLabel: {
        $ref: './size-label.schema.json',
      },
      pieces: {
        type: 'array',
        minItems: 1,
        items: {
          $ref: '#/$defs/CutPiece',
        },
      },
    },
    $defs: {
      EngineRef: {
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
      Segment: {
        type: 'array',
        description: 'Segment de deux points.',
        items: {
          $ref: '../garment-spec.schema.json#/$defs/Point',
        },
        minItems: 2,
        maxItems: 2,
      },
      CutPiece: {
        type: 'object',
        additionalProperties: false,
        required: [
          'panelId',
          'name',
          'quantity',
          'cutOnFold',
          'cutLine',
          'seamLine',
          'notches',
          'grainline',
          'labelAnchor',
          'bounds',
          'cutAreaMm2',
        ],
        properties: {
          panelId: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Nombre de pièces à couper par vêtement (Panel.quantity).',
          },
          cutOnFold: {
            type: 'boolean',
            description:
              'Vrai : la pièce est dessinée à moitié et se coupe sur la pliure du tissu (voir foldLine).',
          },
          cutLine: {
            type: 'array',
            description:
              'Ligne de coupe : polygone fermé (le dernier point rejoint le premier, sans être répété), sens trigonométrique, courbes aplaties.',
            minItems: 3,
            items: {
              $ref: '../garment-spec.schema.json#/$defs/Point',
            },
          },
          seamLine: {
            type: 'array',
            description:
              "Ligne de couture, bord par bord, dans l'ordre de Panel.edges ; la fin de chaque bord est le début du suivant.",
            minItems: 3,
            items: {
              $ref: '#/$defs/SeamLineEdge',
            },
          },
          notches: {
            type: 'array',
            items: {
              $ref: '#/$defs/NotchMark',
            },
          },
          grainline: {
            $ref: '#/$defs/Segment',
            description:
              "Droit fil : celui de la spécification, ou, s'il manque, une ligne verticale (axe y de la pièce) au centre de la pièce.",
          },
          foldLine: {
            $ref: '#/$defs/Segment',
            description: 'Ligne de pliure (bord de rôle fold), présente si cutOnFold est vrai.',
          },
          labelAnchor: {
            $ref: '../garment-spec.schema.json#/$defs/Point',
            description: 'Point intérieur à la pièce où placer son étiquette.',
          },
          bounds: {
            $ref: '#/$defs/Bounds',
          },
          cutAreaMm2: {
            type: 'number',
            minimum: 0,
            description:
              'Aire de la ligne de coupe, en mm², telle que dessinée (moitié de pièce si cutOnFold).',
          },
        },
      },
      SeamLineEdge: {
        type: 'object',
        additionalProperties: false,
        required: ['edgeId', 'role', 'allowanceMm', 'points'],
        properties: {
          edgeId: {
            type: 'string',
          },
          role: {
            type: 'string',
            description: 'Rôle du bord (Edge.role de GarmentSpec ; seam si absent).',
            enum: ['seam', 'fold', 'hem', 'waistline', 'opening'],
          },
          allowanceMm: {
            type: 'integer',
            minimum: 0,
            description: 'Valeur de couture appliquée à ce bord (0 pour une pliure).',
          },
          points: {
            type: 'array',
            description: 'Polyligne du bord (courbe de Bézier aplatie), du début à la fin.',
            minItems: 2,
            items: {
              $ref: '../garment-spec.schema.json#/$defs/Point',
            },
          },
        },
      },
      NotchMark: {
        type: 'object',
        additionalProperties: false,
        required: ['edgeId', 'distanceMm', 'count', 'position', 'segments'],
        properties: {
          edgeId: {
            type: 'string',
          },
          distanceMm: {
            type: 'number',
            minimum: 0,
            description: 'Distance le long de la ligne de couture depuis le début du bord.',
          },
          count: {
            type: 'integer',
            minimum: 1,
            maximum: 3,
          },
          source: {
            type: 'string',
            enum: ['requested', 'auto'],
          },
          position: {
            $ref: '../garment-spec.schema.json#/$defs/Point',
            description: 'Point de la ligne de couture repéré par le cran.',
          },
          segments: {
            type: 'array',
            description:
              "Entailles à couper (une par cran), de la ligne de coupe vers l'intérieur de la pièce.",
            minItems: 1,
            maxItems: 3,
            items: {
              $ref: '#/$defs/Segment',
            },
          },
        },
      },
      Bounds: {
        type: 'object',
        description: 'Rectangle englobant de la ligne de coupe.',
        additionalProperties: false,
        required: ['min', 'max'],
        properties: {
          min: {
            $ref: '../garment-spec.schema.json#/$defs/Point',
          },
          max: {
            $ref: '../garment-spec.schema.json#/$defs/Point',
          },
        },
      },
    },
  },
  cuttingPlanRequest: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/cutting-plan-request.schema.json',
    title: 'CuttingPlanRequest',
    description:
      "Demande de plan de coupe : les vêtements à couper (une spécification et un nombre d'exemplaires chacun), la finition et le tissu. Millimètres.",
    type: 'object',
    additionalProperties: false,
    required: ['garments', 'fabric'],
    properties: {
      garments: {
        type: 'array',
        minItems: 1,
        maxItems: 20,
        items: {
          $ref: '#/$defs/GarmentToCut',
        },
      },
      finishing: {
        $ref: './finishing-options.schema.json',
      },
      fabric: {
        $ref: '#/$defs/FabricLayout',
      },
      spacingMm: {
        type: 'integer',
        description: 'Écart minimal entre deux pièces.',
        minimum: 0,
        maximum: 50,
        default: 5,
      },
    },
    $defs: {
      GarmentToCut: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'spec'],
        properties: {
          label: {
            $ref: './size-label.schema.json',
            description: 'Taille ou repère du vêtement, reporté sur chaque placement.',
          },
          spec: {
            $ref: '../garment-spec.schema.json',
          },
          count: {
            type: 'integer',
            description: "Nombre d'exemplaires du vêtement.",
            minimum: 1,
            maximum: 50,
            default: 1,
          },
        },
      },
      FabricLayout: {
        type: 'object',
        additionalProperties: false,
        required: ['fabricWidthMm'],
        properties: {
          fabricWidthMm: {
            type: 'integer',
            description: 'Laize, lisières comprises.',
            minimum: 300,
            maximum: 3200,
          },
          layout: {
            type: 'string',
            description:
              'single : tissu à plat, une épaisseur (les pièces sur pliure sont dépliées). folded : tissu plié en deux dans le droit fil, deux épaisseurs (une pièce placée donne une paire symétrique ; une pièce sur pliure pose son bord de pliure sur la pliure du tissu).',
            enum: ['single', 'folded'],
            default: 'folded',
          },
          direction: {
            $ref: '#/$defs/FabricDirection',
          },
          selvedgeMarginMm: {
            type: 'integer',
            description: 'Marge laissée le long de chaque lisière.',
            minimum: 0,
            maximum: 50,
            default: 10,
          },
        },
      },
      FabricDirection: {
        type: 'string',
        description:
          'Sens du tissu. one-way : tissu à sens (velours, motif orienté), toutes les pièces dans le même sens. two-way : une pièce peut être tournée de 180°.',
        enum: ['one-way', 'two-way'],
        default: 'two-way',
      },
    },
  },
  cuttingPlan: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/cutting-plan.schema.json',
    title: 'CuttingPlan',
    description:
      'Plan de coupe : placement des pièces sur la laize, métrage et efficience. Repère du plan en millimètres : x le long du tissu (droit fil), de 0 à fabricLengthMm ; y en travers, de 0 à usableWidthMm, y = 0 sur la pliure (folded) ou à la marge de la lisière (single).',
    type: 'object',
    additionalProperties: false,
    required: [
      'unit',
      'engine',
      'fabricWidthMm',
      'usableWidthMm',
      'layout',
      'direction',
      'fabricLengthMm',
      'efficiency',
      'pieceCount',
      'surplusPieceCount',
      'placements',
    ],
    properties: {
      unit: {
        const: 'mm',
      },
      engine: {
        $ref: './cut-pattern.schema.json#/$defs/EngineRef',
      },
      fabricWidthMm: {
        type: 'integer',
        minimum: 300,
      },
      usableWidthMm: {
        type: 'number',
        description:
          "Largeur où l'on place les pièces : laize moins les marges de lisière, divisée par deux si le tissu est plié.",
        minimum: 0,
      },
      layout: {
        type: 'string',
        enum: ['single', 'folded'],
      },
      direction: {
        type: 'string',
        enum: ['one-way', 'two-way'],
      },
      fabricLengthMm: {
        type: 'integer',
        description: 'Métrage : longueur de tissu à couper, arrondie au millimètre supérieur.',
        minimum: 0,
      },
      efficiency: {
        type: 'number',
        description:
          "Aire des pièces placées divisée par l'aire utilisée (usableWidthMm × fabricLengthMm), de 0 à 1, arrondie à 4 décimales.",
        minimum: 0,
        maximum: 1,
      },
      pieceCount: {
        type: 'integer',
        description: 'Nombre de pièces obtenues à la coupe.',
        minimum: 0,
      },
      surplusPieceCount: {
        type: 'integer',
        description: 'Pièces coupées en trop (quantité impaire sur tissu plié).',
        minimum: 0,
      },
      placements: {
        type: 'array',
        items: {
          $ref: '#/$defs/Placement',
        },
      },
    },
    $defs: {
      Placement: {
        type: 'object',
        additionalProperties: false,
        required: [
          'garmentLabel',
          'panelId',
          'copy',
          'plies',
          'rotationDeg',
          'mirrored',
          'onFold',
          'outline',
        ],
        properties: {
          garmentLabel: {
            $ref: './size-label.schema.json',
          },
          panelId: {
            type: 'string',
          },
          copy: {
            type: 'integer',
            description: 'Numéro de placement de cette pièce pour ce vêtement (à partir de 1).',
            minimum: 1,
          },
          plies: {
            type: 'integer',
            description:
              'Pièces obtenues par ce placement : 2 sur tissu plié, 1 sinon ou pour une pièce sur pliure.',
            minimum: 1,
            maximum: 2,
          },
          rotationDeg: {
            type: 'number',
            description:
              'Rotation appliquée à la pièce (repère de GarmentSpec) pour aligner son droit fil sur x, plus 180° si la pièce est retournée.',
            minimum: 0,
            exclusiveMaximum: 360,
          },
          mirrored: {
            type: 'boolean',
            description:
              'Vrai : la pièce est placée en symétrique (paire gauche / droite sur tissu à plat).',
          },
          onFold: {
            type: 'boolean',
            description:
              'Vrai : le bord de pliure de la pièce est posé sur la pliure du tissu (y = 0).',
          },
          outline: {
            type: 'array',
            description:
              'Ligne de coupe placée, dans le repère du plan (dépliée si la pièce sur pliure est coupée à plat).',
            minItems: 3,
            items: {
              $ref: '../garment-spec.schema.json#/$defs/Point',
            },
          },
        },
      },
    },
  },
  exportRequest: {
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
  },
  finishingOptions: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/finishing-options.schema.json',
    title: 'FinishingOptions',
    description:
      "Comment finir les pièces d'un patron : valeurs de couture et crans. Longueurs en millimètres. Absent : valeurs par défaut du moteur (10 mm partout, 30 mm aux ourlets, crans aux raccords de couture).",
    type: 'object',
    additionalProperties: false,
    properties: {
      seamAllowances: {
        $ref: '#/$defs/SeamAllowances',
      },
      notches: {
        type: 'array',
        description: 'Crans demandés en plus des crans automatiques.',
        maxItems: 200,
        items: {
          $ref: '#/$defs/NotchRequest',
        },
      },
      autoNotches: {
        type: 'string',
        description:
          "none : aucun cran automatique. seam-junctions : un cran à chaque jonction de deux bords cousus presque alignés (écart de direction inférieur à 30°), par exemple la ligne de hanches d'une couture de côté, et un cran aux deux extrémités de chaque pince (pince franchie par la ligne de coupe).",
        enum: ['none', 'seam-junctions'],
        default: 'seam-junctions',
      },
    },
    $defs: {
      SeamAllowances: {
        type: 'object',
        description:
          "Priorité : byEdge, puis byRole, puis defaultMm. Un bord de pliure (role fold) n'a jamais de valeur de couture. Si seamAllowances est absent, le moteur applique defaultMm = 10 et byRole.hem = 30.",
        additionalProperties: false,
        properties: {
          defaultMm: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            default: 10,
          },
          byRole: {
            $ref: '#/$defs/RoleAllowances',
          },
          byEdge: {
            type: 'array',
            maxItems: 500,
            items: {
              $ref: '#/$defs/EdgeAllowance',
            },
          },
        },
      },
      RoleAllowances: {
        type: 'object',
        description:
          'Valeur de couture par rôle de bord (voir Edge.role de GarmentSpec). Un bord sans rôle est traité comme une couture (seam).',
        additionalProperties: false,
        properties: {
          seam: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          hem: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          waistline: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          opening: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
        },
      },
      EdgeAllowance: {
        type: 'object',
        additionalProperties: false,
        required: ['panelId', 'edgeId', 'allowanceMm'],
        properties: {
          panelId: {
            type: 'string',
          },
          edgeId: {
            type: 'string',
          },
          allowanceMm: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
        },
      },
      NotchRequest: {
        type: 'object',
        description:
          "Cran demandé sur la pièce panelId : un emplacement (NotchPlacement de GarmentSpec : edgeId, distanceMm, count) sur la ligne de couture d'un de ses bords.",
        allOf: [
          {
            $ref: '../garment-spec.schema.json#/$defs/NotchPlacement',
          },
        ],
        required: ['panelId'],
        properties: {
          panelId: {
            type: 'string',
          },
        },
        unevaluatedProperties: false,
      },
    },
  },
  gradedPatternRequest: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/graded-pattern-request.schema.json',
    title: 'GradedPatternRequest',
    description:
      'Gradation par recalcul : une spécification par taille, toutes calculées par le moteur de patronage avec les mêmes pièces et les mêmes bords (mêmes identifiants, même ordre). Le moteur les finit, les aligne et en déduit les écarts de gradation par rapport à la taille de base.',
    type: 'object',
    additionalProperties: false,
    required: ['baseSize', 'sizes'],
    properties: {
      baseSize: {
        $ref: './size-label.schema.json',
        description: "Taille de base : l'une des tailles de sizes.",
      },
      sizes: {
        type: 'array',
        minItems: 2,
        maxItems: 12,
        items: {
          $ref: '#/$defs/SizedSpec',
        },
      },
      finishing: {
        $ref: './finishing-options.schema.json',
      },
      alignment: {
        type: 'string',
        description:
          "origin : pièces laissées dans leur repère (le moteur de patronage place le point de référence de gradation à l'origine). grainline : chaque pièce est translatée pour que le début de son droit fil coïncide avec celui de la taille de base.",
        enum: ['origin', 'grainline'],
        default: 'origin',
      },
    },
    $defs: {
      SizedSpec: {
        type: 'object',
        additionalProperties: false,
        required: ['size', 'spec'],
        properties: {
          size: {
            $ref: './size-label.schema.json',
          },
          spec: {
            $ref: '../garment-spec.schema.json',
          },
        },
      },
    },
  },
  gradedPattern: {
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
  },
  sizeLabel: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/manufacturing/size-label.schema.json',
    title: 'SizeLabel',
    description:
      'Nom de taille ou repère court (« 38 », « M », « MOD-002 »). Jeu de caractères restreint : il est écrit tel quel dans les exports (SVG, PDF, DXF). Jamais de nom de client.',
    type: 'string',
    pattern: '^[A-Za-z0-9][A-Za-z0-9 ._+/-]{0,23}$',
  },
  measurementSet: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://atelier.example/schemas/measurement-set.schema.json',
    title: 'MeasurementSet',
    description:
      "Mesures du corps d'un client (ISO 8559-1), en millimètres entiers. Une mesure facultative absente est estimée par le moteur de patronage, qui la liste dans GarmentSpec.estimatedMeasurements.",
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
      bustGirthMm: {
        type: 'integer',
        description: 'Tour de poitrine sur les pointes de seins (ISO 8559-1 : bust girth).',
        minimum: 600,
        maximum: 1800,
      },
      underBustGirthMm: {
        type: 'integer',
        description: 'Tour de dessous de poitrine (ISO 8559-1 : underbust girth).',
        minimum: 500,
        maximum: 1700,
      },
      cervicaleHeightMm: {
        type: 'integer',
        description:
          'Hauteur de la vertèbre cervicale saillante depuis le sol (ISO 8559-1 : cervicale height).',
        minimum: 700,
        maximum: 2000,
      },
      waistHeightMm: {
        type: 'integer',
        description: 'Hauteur de la taille depuis le sol (ISO 8559-1 : waist height).',
        minimum: 500,
        maximum: 1400,
      },
      hipHeightMm: {
        type: 'integer',
        description:
          'Hauteur des hanches (tour le plus fort) depuis le sol (ISO 8559-1 : hip height).',
        minimum: 400,
        maximum: 1200,
      },
      backWaistLengthMm: {
        type: 'integer',
        description:
          'Longueur taille dos : de la cervicale à la taille, le long de la colonne (ISO 8559-1 : back waist length).',
        minimum: 300,
        maximum: 600,
      },
      frontWaistLengthMm: {
        type: 'integer',
        description:
          "Longueur taille devant : du point d'encolure à l'épaule à la taille, par la pointe de sein (ISO 8559-1 : front waist length).",
        minimum: 300,
        maximum: 700,
      },
      neckShoulderToBustPointMm: {
        type: 'integer',
        description:
          "Du point d'encolure à l'épaule à la pointe de sein (ISO 8559-1 : neck shoulder point to bust point).",
        minimum: 150,
        maximum: 450,
      },
      bustPointWidthMm: {
        type: 'integer',
        description: 'Écart entre les pointes de seins (ISO 8559-1 : bust point width).',
        minimum: 100,
        maximum: 300,
      },
      shoulderWidthMm: {
        type: 'integer',
        description:
          "Carrure d'épaule à épaule, d'un point d'épaule à l'autre, par le dos (ISO 8559-1 : shoulder width).",
        minimum: 250,
        maximum: 550,
      },
      armscyeDepthMm: {
        type: 'integer',
        description:
          "Profondeur d'emmanchure : de la ligne d'épaule au niveau du dessous de bras (ISO 8559-1 : armscye depth).",
        minimum: 100,
        maximum: 300,
      },
      armLengthMm: {
        type: 'integer',
        description:
          "Longueur de bras : du point d'épaule au poignet, coude légèrement plié (ISO 8559-1 : arm length).",
        minimum: 400,
        maximum: 900,
      },
    },
  },
} as const;
