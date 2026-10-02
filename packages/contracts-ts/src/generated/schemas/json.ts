// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « avatarOptions ». */
export const avatarOptionsJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/avatar-options.schema.json',
  title: 'AvatarOptions',
  description:
    "Options d'ajustement de l'avatar (FitOptions du moteur mannequin), en plus des mesures. Champ absent : défaut du studio. Le même jeu d'options donne le même corps dans le studio et dans le drapé (ADR 0013).",
  type: 'object',
  additionalProperties: false,
  properties: {
    age: {
      type: 'integer',
      description: 'Âge en années. Défaut : 30.',
      minimum: 16,
      maximum: 90,
      default: 30,
    },
    morphotype: {
      type: 'object',
      description:
        'Proportions de morphotype, de 0 à 1 chacune (normalisées par le moteur mannequin ; somme nulle : africain). Défaut : africain (1, 0, 0).',
      additionalProperties: false,
      required: ['african', 'asian', 'caucasian'],
      properties: {
        african: { type: 'number', minimum: 0, maximum: 1 },
        asian: { type: 'number', minimum: 0, maximum: 1 },
        caucasian: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    armAngleDeg: {
      type: 'number',
      description: "Bras abaissés depuis l'horizontale, en degrés. Défaut : 9.",
      minimum: 0,
      maximum: 45,
      default: 9,
    },
  },
} as const;

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

/** Schéma JSON brut « createDesignVersionRequest ». */
export const createDesignVersionRequestJsonSchema = {
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
} as const;

/** Schéma JSON brut « cutPatternOptions ». */
export const cutPatternOptionsJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/cut-pattern-options.schema.json',
  title: 'CutPatternOptions',
  description:
    "Comment finir les pièces d'une version de modèle. Corps vide ({}) : valeurs par défaut du moteur de fabrication (10 mm partout, 30 mm aux ourlets, crans aux raccords). Longueurs en millimètres.",
  type: 'object',
  additionalProperties: false,
  properties: {
    finishing: { $ref: '../manufacturing/finishing-options.schema.json' },
    sizeLabel: {
      $ref: '../manufacturing/size-label.schema.json',
      description: 'Taille ou repère reporté sur les pièces. Jamais de nom de client.',
    },
  },
} as const;

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

/** Schéma JSON brut « designVersionChanges ». */
export const designVersionChangesJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/design-version-changes.schema.json',
  title: 'DesignVersionChanges',
  description:
    "Ce qui change des entrées d'une version de modèle (to) par rapport à une autre (from) : paramètres du vêtement et mesures du client, valeurs telles qu'envoyées, sans appliquer les défauts. Seules les entrées différentes sont listées. Contient des mesures : réservé à l'organisation propriétaire, jamais gardé en cache ni journalisé. Longueurs en millimètres.",
  type: 'object',
  additionalProperties: false,
  required: ['designId', 'from', 'to', 'sameFingerprint', 'params', 'measurements'],
  properties: {
    designId: { type: 'string', format: 'uuid' },
    from: { $ref: './design-version-summary.schema.json' },
    to: { $ref: './design-version-summary.schema.json' },
    sameFingerprint: {
      type: 'boolean',
      description:
        'Vrai si les deux versions ont la même empreinte : mêmes mesures, mêmes paramètres, même version du moteur, donc même patron.',
    },
    params: {
      type: 'array',
      description: 'Paramètres différents, triés par chemin.',
      maxItems: 100,
      items: { $ref: '#/$defs/ParamChange' },
    },
    measurements: {
      type: 'array',
      description: 'Mesures différentes, triées par nom.',
      maxItems: 100,
      items: { $ref: '#/$defs/MeasurementChange' },
    },
  },
  $defs: {
    ParamChange: {
      type: 'object',
      additionalProperties: false,
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description:
            'Chemin du paramètre dans GarmentRequest.params, points entre les niveaux (ex. lengthMm, sleeve.capEaseMm).',
          pattern: '^[a-z][A-Za-z0-9]*([.][a-z][A-Za-z0-9]*)*$',
          maxLength: 120,
        },
        from: {
          type: ['number', 'string', 'boolean'],
          description: 'Valeur dans la version from. Absent : paramètre absent (défaut du moteur).',
        },
        to: {
          type: ['number', 'string', 'boolean'],
          description: 'Valeur dans la version to. Absent : paramètre absent (défaut du moteur).',
        },
      },
    },
    MeasurementChange: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Nom de champ de MeasurementSet (ex. waistGirthMm).',
          pattern: '^[a-z][A-Za-z0-9]*$',
          maxLength: 64,
        },
        from: {
          type: ['integer', 'string'],
          description:
            'Valeur dans la version from (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin).',
        },
        to: {
          type: ['integer', 'string'],
          description:
            'Valeur dans la version to (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin).',
        },
      },
    },
  },
} as const;

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

/** Schéma JSON brut « designVersionSummary ». */
export const designVersionSummaryJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/design-version-summary.schema.json',
  title: 'DesignVersionSummary',
  description:
    "Résumé d'une version de modèle, pour une liste : ni mesures du client ni patron (lire la version pour les obtenir). Longueurs des paramètres en millimètres.",
  type: 'object',
  additionalProperties: false,
  required: ['number', 'createdAt', 'fingerprint', 'engineVersion', 'garment'],
  properties: {
    number: { type: 'integer', minimum: 1 },
    createdAt: { type: 'string', format: 'date-time' },
    fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    engineVersion: {
      type: 'string',
      description: 'Version du moteur de patronage qui a tracé le patron (spec.engine.version).',
    },
    garment: {
      $ref: '../garment-request.schema.json',
      description: "Type de vêtement et paramètres demandés, tels qu'envoyés.",
    },
  },
} as const;

/** Schéma JSON brut « designVersion ». */
export const designVersionJsonSchema = {
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
} as const;

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

/** Schéma JSON brut « drapeRequest ». */
export const drapeRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/drape-request.schema.json',
  title: 'DrapeRequest',
  description:
    "Demande de drapé d'une version de modèle : le tissu, les options de l'avatar et la finesse. Les mesures et le patron sont ceux de la version. Même demande canonique sur la même version : même drapé (ADR 0013).",
  type: 'object',
  additionalProperties: false,
  required: ['fabric'],
  properties: {
    fabric: { $ref: '../drape/fabric.schema.json' },
    avatar: {
      $ref: '../avatar-options.schema.json',
      description: 'Absent : défauts du studio, comme {}.',
    },
    quality: {
      type: 'string',
      description: 'draft (arête de 25 mm) ou standard (arête de 15 mm).',
      enum: ['draft', 'standard'],
      default: 'standard',
    },
  },
} as const;

/** Schéma JSON brut « drape ». */
export const drapeJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/designs/drape.schema.json',
  title: 'Drape',
  description:
    "Drapé d'une version de modèle, tel que le service designs le suit. Le modèle 3D se lit par GET …/drapes/{drapeId}/model une fois le drapé completed. Longueurs en millimètres.",
  type: 'object',
  additionalProperties: false,
  required: ['id', 'status', 'createdAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: {
      type: 'string',
      description:
        'pending : en calcul ; completed : modèle disponible ; failed : voir problemType. Un drapé encore pending 10 minutes après createdAt est lu failed (drape-timeout).',
      enum: ['pending', 'completed', 'failed'],
    },
    problemType: {
      type: 'string',
      description:
        'Seulement si status vaut failed. Types de drape.failed, plus /problems/drape-timeout.',
      enum: [
        '/problems/drape-placement-missing',
        '/problems/drape-placement-failed',
        '/problems/drape-seam-not-closed',
        '/problems/drape-body-penetration',
        '/problems/drape-too-large',
        '/problems/drape-internal',
        '/problems/drape-timeout',
      ],
    },
    ease: {
      $ref: '../drape/drape-result.schema.json#/$defs/DrapeEase',
      description: 'Seulement si status vaut completed.',
    },
    maxStrainPercent: {
      type: 'number',
      description:
        'Seulement si status vaut completed. Allongement relatif maximal, en pourcentage.',
      minimum: -100,
      maximum: 1000,
    },
    fabricEstimated: {
      type: 'boolean',
      description:
        "Seulement si status vaut completed. Vrai si le tissu vient d'un préréglage estimé.",
    },
    createdAt: { type: 'string', format: 'date-time' },
    completedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Fin du calcul (completed ou failed), en UTC.',
    },
  },
} as const;

/** Schéma JSON brut « drapeJob ». */
export const drapeJobJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/drape-job.schema.json',
  title: 'DrapeJob',
  description:
    "Tâche de drapé confiée au moteur drape (données de drape.requested). Contient des mesures de client : jamais journalisée (ADR 0013). L'avatar est recalculé par le moteur depuis measurements et avatar, jamais transmis.",
  type: 'object',
  additionalProperties: false,
  required: [
    'drapeId',
    'organizationId',
    'designId',
    'versionNumber',
    'spec',
    'measurements',
    'avatar',
    'fabric',
    'quality',
  ],
  properties: {
    drapeId: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    designId: { type: 'string', format: 'uuid' },
    versionNumber: { type: 'integer', minimum: 1 },
    spec: { $ref: '../garment-spec.schema.json' },
    measurements: { $ref: '../measurement-set.schema.json' },
    avatar: { $ref: '../avatar-options.schema.json' },
    fabric: { $ref: './fabric.schema.json' },
    quality: {
      type: 'string',
      description:
        'Finesse du maillage du vêtement : draft (arête de 25 mm), standard (arête de 15 mm).',
      enum: ['draft', 'standard'],
    },
  },
} as const;

/** Schéma JSON brut « drapeResult ». */
export const drapeResultJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/drape-result.schema.json',
  title: 'DrapeResult',
  description:
    "Résultat d'un drapé réussi : le modèle glTF binaire (vêtement seul) écrit dans le stockage objet, et ses indicateurs. Longueurs en millimètres, surfaces en millimètres carrés.",
  type: 'object',
  additionalProperties: false,
  required: [
    'modelKey',
    'sizeBytes',
    'sha256',
    'ease',
    'maxStrainPercent',
    'fabricEstimated',
    'engineVersion',
    'vertexCount',
    'simulatedSteps',
    'converged',
  ],
  properties: {
    modelKey: {
      type: 'string',
      description:
        "Clé de l'objet dans le seau privé des drapés : drapes/<organizationId>/<cacheKey>.glb. Jamais d'URL publique.",
      pattern: '^drapes/[0-9a-f-]{36}/[a-f0-9]{64}[.]glb$',
      maxLength: 120,
    },
    sizeBytes: { type: 'integer', minimum: 1, maximum: 268435456 },
    sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    ease: { $ref: '#/$defs/DrapeEase' },
    maxStrainPercent: {
      type: 'number',
      description:
        'Allongement relatif maximal du tissu, en pourcentage (négatif : compression partout).',
      minimum: -100,
      maximum: 1000,
    },
    fabricEstimated: {
      type: 'boolean',
      description: "Vrai si une propriété du tissu vient d'un préréglage estimé.",
    },
    engineVersion: { type: 'string', minLength: 1, maxLength: 64 },
    vertexCount: { type: 'integer', minimum: 1, maximum: 30000 },
    simulatedSteps: { type: 'integer', minimum: 0, maximum: 1000000 },
    converged: {
      type: 'boolean',
      description:
        'Vrai si la vitesse maximale est restée sous 1 mm/s pendant 10 pas avant la fin.',
    },
  },
  $defs: {
    DrapeEase: {
      type: 'object',
      description:
        "Aisance : distance du tissu au corps moins l'épaisseur du tissu, en millimètres (négative : pénétration).",
      additionalProperties: false,
      required: ['minMm', 'medianMm', 'maxMm', 'tightAreaMm2'],
      properties: {
        minMm: { type: 'number', minimum: -1000, maximum: 2000 },
        medianMm: { type: 'number', minimum: -1000, maximum: 2000 },
        maxMm: { type: 'number', minimum: -1000, maximum: 2000 },
        tightAreaMm2: {
          type: 'number',
          description:
            "Surface du vêtement où l'aisance est nulle (tissu au contact du corps), en mm².",
          minimum: 0,
          maximum: 100000000,
        },
      },
    },
  },
} as const;

/** Schéma JSON brut « fabricBenchMeasurements ». */
export const fabricBenchMeasurementsJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric-bench-measurements.schema.json',
  title: 'FabricBenchMeasurements',
  description:
    "Mesures brutes d'un tissu, saisies par un modéliste au banc d'essai des tissus, telles que lues sur les instruments (ADR 0015). Chaque essai est facultatif ; stretchWarp et bendingWarp portent sur une bande découpée dans le sens de la chaîne (droit fil), stretchWeft et bendingWeft dans le sens de la trame (travers du fil). Les grandeurs physiques en sont déduites par le moteur de drapé ; elles ne sont jamais saisies directement. Mesures d'un tissu, jamais d'une personne.",
  type: 'object',
  additionalProperties: false,
  properties: {
    weighing: { $ref: '#/$defs/FabricWeighing' },
    thickness: { $ref: '#/$defs/FabricThicknessTest' },
    stretchWarp: { $ref: '#/$defs/StripStretchTest' },
    stretchWeft: { $ref: '#/$defs/StripStretchTest' },
    bendingWarp: { $ref: '#/$defs/CantileverBendingTest' },
    bendingWeft: { $ref: '#/$defs/CantileverBendingTest' },
    friction: { $ref: '#/$defs/InclinedPlaneFrictionTest' },
    drape: { $ref: '#/$defs/MeasuredDrape' },
  },
  $defs: {
    FabricWeighing: {
      title: 'FabricWeighing',
      type: 'object',
      description:
        "Pesée d'un échantillon découpé. Grammage déduit : masse / aire × 1 000 000, en g/m².",
      additionalProperties: false,
      required: ['sampleMassG', 'sampleAreaMm2'],
      properties: {
        sampleMassG: {
          type: 'number',
          description: "Masse de l'échantillon, en grammes.",
          exclusiveMinimum: 0,
          maximum: 1000,
        },
        sampleAreaMm2: {
          type: 'number',
          description:
            "Aire de l'échantillon, en millimètres carrés (50 × 50 mm au moins, 1 m² au plus).",
          minimum: 2500,
          maximum: 1000000,
        },
      },
    },
    FabricThicknessTest: {
      title: 'FabricThicknessTest',
      type: 'object',
      description:
        'Épaisseur au pied à coulisse ou au micromètre, mâchoires serrées sans écraser le tissu. Épaisseur déduite : moyenne des lectures, en mm.',
      additionalProperties: false,
      required: ['readingsMm'],
      properties: {
        readingsMm: {
          type: 'array',
          description: "Lectures en différents points de l'échantillon, en millimètres.",
          minItems: 1,
          maxItems: 32,
          items: { type: 'number', minimum: 0.01, maximum: 10 },
        },
      },
    },
    StripStretchTest: {
      title: 'StripStretchTest',
      type: 'object',
      description:
        "Allongement d'une bande suspendue sous une masse connue. Deux repères tracés sur la bande, distance mesurée avant et après la mise en charge. Allongement déduit, ramené à la charge de référence de Fabric (10 N sur 50 mm de large) par proportionnalité (hypothèse linéaire, ADR 0015).",
      additionalProperties: false,
      required: ['stripWidthMm', 'gaugeLengthMm', 'loadedLengthMm', 'hangingMassG'],
      properties: {
        stripWidthMm: {
          type: 'number',
          description: 'Largeur de la bande, en millimètres (50 mm recommandés).',
          minimum: 10,
          maximum: 100,
        },
        gaugeLengthMm: {
          type: 'number',
          description:
            'Distance entre les repères avant la mise en charge (bande suspendue, sans masse), en millimètres (200 mm recommandés).',
          minimum: 50,
          maximum: 1000,
        },
        loadedLengthMm: {
          type: 'number',
          description:
            'Distance entre les repères sous la masse, en millimètres ; au moins gaugeLengthMm.',
          minimum: 50,
          maximum: 2000,
        },
        hangingMassG: {
          type: 'number',
          description:
            'Masse suspendue à la bande, pince comprise, en grammes (1 000 g donnent 9,81 N, proche de la charge de référence).',
          minimum: 50,
          maximum: 5000,
        },
      },
    },
    CantileverBendingTest: {
      title: 'CantileverBendingTest',
      type: 'object',
      description:
        "Flexion au porte-à-faux (ASTM D1388, option A ; ISO 9073-7) : bande de 25 × 200 mm poussée au-delà du bord d'une plateforme jusqu'à ce que sa pointe touche un plan incliné à 41,5°. Longueur de flexion c = porte-à-faux / 2 ; rigidité de flexion B = grammage × g × c³ (ADR 0015).",
      additionalProperties: false,
      required: ['overhangLengthsMm'],
      properties: {
        overhangLengthsMm: {
          type: 'array',
          description:
            'Longueurs en porte-à-faux lues sur la règle, en millimètres (quatre recommandées : chaque extrémité, chaque face).',
          minItems: 1,
          maxItems: 32,
          items: { type: 'number', minimum: 5, maximum: 500 },
        },
      },
    },
    InclinedPlaneFrictionTest: {
      title: 'InclinedPlaneFrictionTest',
      type: 'object',
      description:
        "Frottement au plan incliné : un patin lesté recouvert du tissu, posé sur une planche recouverte de la surface d'appui, qu'on incline lentement jusqu'au glissement. Coefficient déduit : moyenne des tan θ (frottement statique, ADR 0015).",
      additionalProperties: false,
      required: ['slideAnglesDeg', 'counterSurface'],
      properties: {
        slideAnglesDeg: {
          type: 'array',
          description:
            "Angles de la planche au moment du glissement, en degrés par rapport à l'horizontale.",
          minItems: 1,
          maxItems: 32,
          items: { type: 'number', exclusiveMinimum: 0, maximum: 75 },
        },
        counterSurface: {
          type: 'string',
          description:
            "Surface d'appui : dress-form-cover (housse d'un buste de couture), skin-substitute (peau synthétique), same-fabric (le tissu lui-même), other. Le moteur de drapé modélise le frottement du tissu sur le corps.",
          enum: ['dress-form-cover', 'skin-substitute', 'same-fabric', 'other'],
        },
      },
    },
    MeasuredDrape: {
      title: 'MeasuredDrape',
      type: 'object',
      description:
        "Coefficient de drapé mesuré au drapomètre de Cusick (BS 5058, ISO 9073-9), si l'atelier en a un : DC = (aire de l'ombre − aire du disque) / (aire de l'éprouvette − aire du disque).",
      additionalProperties: false,
      required: ['drapeCoefficient', 'specimenDiameterMm', 'discDiameterMm'],
      properties: {
        drapeCoefficient: {
          type: 'number',
          description:
            'Coefficient de drapé, sans unité (0 : tombe à la verticale ; 1 : reste plat).',
          minimum: 0,
          maximum: 1,
        },
        specimenDiameterMm: {
          type: 'number',
          description:
            "Diamètre de l'éprouvette circulaire, en millimètres. Seul l'essai de 300 mm est comparable à l'essai simulé.",
          enum: [300],
        },
        discDiameterMm: {
          type: 'number',
          description: 'Diamètre du disque support, en millimètres.',
          enum: [180],
        },
      },
    },
  },
} as const;

/** Schéma JSON brut « fabricDerivedValues ». */
export const fabricDerivedValuesJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric-derived-values.schema.json',
  title: 'FabricDerivedValues',
  description:
    "Grandeurs physiques déduites des mesures brutes (FabricBenchMeasurements) par les fonctions du banc d'essai du moteur de drapé (ADR 0015). Une grandeur n'est présente que si l'essai correspondant a été saisi. Informatives dans un rapport : recalculées depuis les mesures brutes à chaque import. Elles peuvent sortir des bornes de Fabric (le tissu ne se modélise alors pas tel quel).",
  type: 'object',
  additionalProperties: false,
  properties: {
    weightGPerM2: {
      type: 'number',
      description: 'Grammage, en grammes par mètre carré.',
      minimum: 0,
    },
    thicknessMm: {
      type: 'number',
      description: 'Épaisseur moyenne, en millimètres.',
      minimum: 0,
    },
    stretchWarpPercent: {
      type: 'number',
      description: 'Allongement chaîne ramené à 10 N sur 50 mm de large, en pourcentage.',
      minimum: 0,
    },
    stretchWeftPercent: {
      type: 'number',
      description: 'Allongement trame ramené à 10 N sur 50 mm de large, en pourcentage.',
      minimum: 0,
    },
    bendingLengthWarpMm: {
      type: 'number',
      description:
        'Longueur de flexion dans le sens chaîne (porte-à-faux moyen / 2), en millimètres.',
      minimum: 0,
    },
    bendingLengthWeftMm: {
      type: 'number',
      description: 'Longueur de flexion dans le sens trame, en millimètres.',
      minimum: 0,
    },
    bendingRigidityWarpMicroNm: {
      type: 'number',
      description: 'Rigidité de flexion par unité de largeur, sens chaîne, en µN·m.',
      minimum: 0,
    },
    bendingRigidityWeftMicroNm: {
      type: 'number',
      description: 'Rigidité de flexion par unité de largeur, sens trame, en µN·m.',
      minimum: 0,
    },
    bendingRigidityMicroNm: {
      type: 'number',
      description:
        'Rigidité de flexion retenue, en µN·m : moyenne géométrique chaîne et trame, ou le seul sens mesuré (le moteur de drapé a une flexion isotrope).',
      minimum: 0,
    },
    bendingWeightSource: {
      type: 'string',
      description:
        'Grammage utilisé pour la rigidité de flexion : measured (pesée saisie) ou estimated (grammage du préréglage, faute de pesée).',
      enum: ['measured', 'estimated'],
    },
    frictionCoefficient: {
      type: 'number',
      description: 'Coefficient de frottement statique (moyenne des tan θ), sans unité.',
      minimum: 0,
    },
  },
} as const;

/** Schéma JSON brut « fabricPhysics ». */
export const fabricPhysicsJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric-physics.schema.json',
  title: 'FabricPhysics',
  description:
    "Les six propriétés physiques d'un tissu (même nom et même forme que FabricPhysics du moteur de drapé), toutes présentes, chacune dans son unité (suffixe) et dans les bornes de Fabric : valeurs d'un préréglage du moteur de drapé, ou valeurs corrigées par un modéliste au banc d'essai des tissus (ADR 0015).",
  type: 'object',
  additionalProperties: false,
  required: [
    'weightGPerM2',
    'thicknessMm',
    'stretchWarpPercent',
    'stretchWeftPercent',
    'bendingRigidityMicroNm',
    'frictionCoefficient',
  ],
  properties: {
    weightGPerM2: { $ref: './fabric.schema.json#/properties/weightGPerM2' },
    thicknessMm: { $ref: './fabric.schema.json#/properties/thicknessMm' },
    stretchWarpPercent: { $ref: './fabric.schema.json#/properties/stretchWarpPercent' },
    stretchWeftPercent: { $ref: './fabric.schema.json#/properties/stretchWeftPercent' },
    bendingRigidityMicroNm: {
      $ref: './fabric.schema.json#/properties/bendingRigidityMicroNm',
    },
    frictionCoefficient: { $ref: './fabric.schema.json#/properties/frictionCoefficient' },
  },
} as const;

/** Schéma JSON brut « fabricPresetReview ». */
export const fabricPresetReviewJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric-preset-review.schema.json',
  title: 'FabricPresetReview',
  description:
    "Revue d'un préréglage de tissu par un modéliste au banc d'essai des tissus (ADR 0015). estimated : valeurs du préréglage revues, telles que les définit le moteur de drapé du rapport (FabricValidationReport.engineVersion) ; measurements : mesures d'atelier brutes ; derived : grandeurs qui en sont déduites ; corrected : valeurs à substituer au préréglage, présentes si et seulement si verdict vaut corrected ; simulatedDrape : essais de drapé simulés. Aucun nom de personne ni donnée personnelle.",
  type: 'object',
  additionalProperties: false,
  required: ['preset', 'verdict', 'reviewedAt', 'estimated'],
  properties: {
    preset: { $ref: './fabric.schema.json#/properties/preset' },
    verdict: {
      type: 'string',
      description:
        "validated : l'estimation est conservée ; corrected : les valeurs de corrected remplacent l'estimation ; to-review : à reprendre (mesures manquantes, doute).",
      enum: ['validated', 'corrected', 'to-review'],
    },
    reviewedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Dernière modification de cette revue, en UTC (suffixe Z).',
      pattern: 'Z$',
    },
    estimated: { $ref: './fabric-physics.schema.json' },
    measurements: { $ref: './fabric-bench-measurements.schema.json' },
    derived: { $ref: './fabric-derived-values.schema.json' },
    corrected: { $ref: './fabric-physics.schema.json' },
    simulatedDrape: { $ref: '#/$defs/SimulatedDrapeTests' },
    comment: {
      type: 'string',
      description:
        "Commentaire libre du modéliste, sur le tissu seulement : ni nom, ni coordonnées, ni donnée d'un client.",
      maxLength: 500,
    },
  },
  if: {
    properties: { verdict: { const: 'corrected' } },
    required: ['verdict'],
  },
  then: { properties: { corrected: true }, required: ['corrected'] },
  else: { properties: { corrected: false } },
  $defs: {
    SimulatedDrapeTests: {
      type: 'object',
      description:
        "Essais de drapé de Cusick simulés par le moteur de drapé, côte à côte. estimated : avec les valeurs estimées du préréglage ; candidate : avec les valeurs candidates (corrected si présentes, sinon l'estimation où chaque grandeur mesurée, dans les bornes de Fabric, remplace la valeur estimée).",
      additionalProperties: false,
      properties: {
        estimated: { $ref: '#/$defs/CusickSimulation' },
        candidate: { $ref: '#/$defs/CusickSimulation' },
      },
    },
    CusickSimulation: {
      type: 'object',
      description:
        'Essai de drapé de Cusick simulé (fabric : propriétés simulées) : éprouvette circulaire de 300 mm sur un disque de 180 mm (BS 5058, ISO 9073-9).',
      additionalProperties: false,
      required: ['fabric', 'drapeCoefficient', 'converged', 'simulatedSteps'],
      properties: {
        fabric: { $ref: './fabric-physics.schema.json' },
        drapeCoefficient: {
          type: 'number',
          description: 'Coefficient de drapé simulé, sans unité, borné à [0, 1].',
          minimum: 0,
          maximum: 1,
        },
        converged: {
          type: 'boolean',
          description: "Vrai si le tissu s'est immobilisé avant la fin de la simulation.",
        },
        simulatedSteps: {
          type: 'integer',
          description: 'Nombre de pas de simulation effectués.',
          minimum: 0,
          maximum: 1000000,
        },
      },
    },
  },
} as const;

/** Schéma JSON brut « fabricValidationReport ». */
export const fabricValidationReportJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric-validation-report.schema.json',
  title: 'FabricValidationReport',
  description:
    "Rapport de validation des préréglages de tissu, produit par le banc d'essai des tissus du studio, téléchargé puis ré-importable pour reprendre le travail (ADR 0015). Un développeur l'applique aux préréglages du moteur de drapé. Aucun nom de personne ni donnée personnelle.",
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'createdAt', 'updatedAt', 'engineVersion', 'reviews'],
  properties: {
    schemaVersion: { const: '1.0' },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Création du rapport, en UTC (suffixe Z).',
      pattern: 'Z$',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Dernier enregistrement du rapport, en UTC (suffixe Z).',
      pattern: 'Z$',
    },
    engineVersion: {
      type: 'string',
      description:
        'Version du moteur de drapé (@atelier/drape) dont viennent les valeurs estimées et les essais simulés du rapport.',
      minLength: 1,
      maxLength: 64,
    },
    reviews: {
      type: 'array',
      description:
        "Une revue par préréglage, au plus une par valeur de preset (vérifié à l'import).",
      minItems: 1,
      maxItems: 32,
      items: { $ref: './fabric-preset-review.schema.json' },
    },
  },
} as const;

/** Schéma JSON brut « fabric ». */
export const fabricJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/drape/fabric.schema.json',
  title: 'Fabric',
  description:
    "Tissu d'un drapé : un préréglage et des surcharges facultatives, chacune dans son unité (suffixe). Les valeurs des préréglages sont dans le moteur de drapé et sont des estimations, signalées par DrapeResult.fabricEstimated (ADR 0013).",
  type: 'object',
  additionalProperties: false,
  required: ['preset'],
  properties: {
    preset: {
      type: 'string',
      enum: ['cotton-poplin', 'cotton-wax', 'bazin', 'linen', 'denim', 'silk-satin', 'jersey'],
    },
    weightGPerM2: {
      type: 'number',
      description: 'Grammage, en grammes par mètre carré.',
      minimum: 20,
      maximum: 800,
    },
    thicknessMm: {
      type: 'number',
      description: 'Épaisseur, en millimètres.',
      minimum: 0.1,
      maximum: 5,
    },
    stretchWarpPercent: {
      type: 'number',
      description:
        'Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage.',
      minimum: 0,
      maximum: 100,
    },
    stretchWeftPercent: {
      type: 'number',
      description:
        'Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage.',
      minimum: 0,
      maximum: 100,
    },
    bendingRigidityMicroNm: {
      type: 'number',
      description:
        'Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m).',
      minimum: 0.1,
      maximum: 5000,
    },
    frictionCoefficient: {
      type: 'number',
      description: 'Coefficient de frottement du tissu sur le corps (sans unité).',
      minimum: 0,
      maximum: 1.5,
    },
  },
} as const;

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

/** Schéma JSON brut « designVersioned ». */
export const designVersionedJsonSchema = {
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
} as const;

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

/** Schéma JSON brut « drapeFailed ». */
export const drapeFailedJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/events/drape-failed.schema.json',
  title: 'DrapeFailed',
  description:
    "Données de l'événement drape.failed : le drapé drapeId n'a pas pu être calculé. Un type d'erreur stable, aucun texte libre ni mesure.",
  type: 'object',
  additionalProperties: false,
  required: ['drapeId', 'designId', 'versionNumber', 'organizationId', 'type', 'retryable'],
  properties: {
    drapeId: { type: 'string', format: 'uuid' },
    designId: { type: 'string', format: 'uuid' },
    versionNumber: { type: 'integer', minimum: 1 },
    organizationId: { type: 'string', format: 'uuid' },
    type: {
      type: 'string',
      description:
        'placement-missing : une pièce sans Panel.placement ; placement-failed : pose initiale impossible ; seam-not-closed : couture encore ouverte à la fin ; body-penetration : tissu dans le corps à la fin ; too-large : plus de 40 pièces, 2 000 bords ou 30 000 sommets ; internal : erreur du moteur.',
      enum: [
        '/problems/drape-placement-missing',
        '/problems/drape-placement-failed',
        '/problems/drape-seam-not-closed',
        '/problems/drape-body-penetration',
        '/problems/drape-too-large',
        '/problems/drape-internal',
      ],
    },
    retryable: {
      type: 'boolean',
      description:
        'Vrai si la même demande peut réussir plus tard (erreur passagère) ; faux si elle échouera encore.',
    },
  },
} as const;

/** Schéma JSON brut « drapeRequested ». */
export const drapeRequestedJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/events/drape-requested.schema.json',
  title: 'DrapeRequested',
  description:
    "Données de l'événement drape.requested : une tâche de drapé (DrapeJob). Contient des mesures : jamais journalisée.",
  $ref: '../drape/drape-job.schema.json',
} as const;

/** Schéma JSON brut « garmentRequest ». */
export const garmentRequestJsonSchema = {
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
} as const;

/** Schéma JSON brut « garmentSpec ». */
export const garmentSpecJsonSchema = {
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
        placement: {
          $ref: '#/$defs/PanelPlacement',
        },
      },
    },
    PanelPlacement: {
      type: 'object',
      description:
        "Pose de la pièce autour du corps, pour l'habillage et le drapé (ADR 0013). Facultative : sans elle, la pièce ne peut pas être drapée. Une pièce cutOnFold est dépliée par symétrie sur son bord de rôle fold, sa moitié dessinée allant du côté bodySide. Une pièce quantity: 2 donne deux exemplaires : une copie telle que dessinée du côté bodySide et une copie retournée (miroir) de l'autre côté du porteur.",
      additionalProperties: false,
      required: ['zone', 'bodySide', 'facing', 'anchor'],
      properties: {
        zone: {
          type: 'string',
          enum: ['torso', 'leg', 'arm'],
          description: "Partie du corps autour de laquelle la pièce s'enroule.",
        },
        bodySide: {
          type: 'string',
          enum: ['left', 'right', 'center'],
          description:
            'Côté du porteur (sa gauche, sa droite, ou à cheval sur le milieu) où va la pièce telle que dessinée.',
        },
        facing: {
          type: 'string',
          enum: ['front', 'back', 'outer'],
          description:
            "Face du corps vers laquelle regarde l'endroit de la pièce ; outer pour une pièce enroulée autour d'un membre.",
        },
        anchor: {
          type: 'object',
          additionalProperties: false,
          required: ['point', 'landmark'],
          description:
            'Point de la pièce posé sur la ligne médiane de la face facing, à la hauteur du repère landmark plus offsetMm.',
          properties: {
            point: {
              $ref: '#/$defs/Point',
            },
            landmark: {
              type: 'string',
              enum: ['neck', 'shoulder', 'waist', 'hip', 'crotch', 'knee', 'ankle', 'wrist'],
              description: 'Repère de hauteur du corps ajusté.',
            },
            offsetMm: {
              type: 'number',
              minimum: -500,
              maximum: 500,
              default: 0,
              description:
                'Décalage vertical depuis le repère, en millimètres, positif vers le haut.',
            },
          },
        },
        clearanceMm: {
          type: 'number',
          minimum: 5,
          maximum: 150,
          default: 30,
          description: 'Distance au corps de la position de départ, en millimètres.',
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
        side: {
          type: 'string',
          enum: ['left', 'right'],
          description:
            'Exemplaire du bord à coudre, côté du porteur, quand la règle de la couture (Seam) ne suffit pas. Absent : règle de Seam.',
        },
      },
    },
    Seam: {
      type: 'object',
      description:
        "Couture entre deux bords. Convention, une fois les pièces dépliées (cutOnFold) et les copies retournées (quantity: 2) posées (PanelPlacement) : a se coud de son début (from) vers sa fin sur b de sa fin vers son début (sens opposés). Une couture entre deux bords présents des deux côtés du porteur est dupliquée côté par côté (gauche avec gauche, droite avec droite) ; entre un bord présent des deux côtés et un bord d'un seul côté, elle prend la copie de ce côté. EdgeRef.side force la copie quand la règle ne suffit pas.",
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
} as const;

/** Schéma JSON brut « garmentType ». */
export const garmentTypeJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/garment-type.schema.json',
  title: 'GarmentType',
  description:
    "Type de vêtement connu de la plateforme (ADR 0010). Même valeur que GarmentRequest.type. Un type dont le tracé n'est pas encore livré est refusé par le moteur de patronage (problème garment-type-not-supported).",
  type: 'string',
  enum: ['straight-skirt', 'circle-skirt', 'trousers', 'bodice'],
} as const;

/** Schéma JSON brut « cutPatternRequest ». */
export const cutPatternRequestJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/cut-pattern-request.schema.json',
  title: 'CutPatternRequest',
  description: 'Demande de pièces de coupe : une spécification de patron et la façon de la finir.',
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
} as const;

/** Schéma JSON brut « cutPattern ». */
export const cutPatternJsonSchema = {
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
} as const;

/** Schéma JSON brut « cuttingPlanRequest ». */
export const cuttingPlanRequestJsonSchema = {
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
} as const;

/** Schéma JSON brut « cuttingPlan ». */
export const cuttingPlanJsonSchema = {
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
} as const;

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

/** Schéma JSON brut « finishingOptions ». */
export const finishingOptionsJsonSchema = {
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
} as const;

/** Schéma JSON brut « gradedPatternRequest ». */
export const gradedPatternRequestJsonSchema = {
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
} as const;

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

/** Schéma JSON brut « sizeLabel ». */
export const sizeLabelJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/manufacturing/size-label.schema.json',
  title: 'SizeLabel',
  description:
    'Nom de taille ou repère court (« 38 », « M », « MOD-002 »). Jeu de caractères restreint : il est écrit tel quel dans les exports (SVG, PDF, DXF). Jamais de nom de client.',
  type: 'string',
  pattern: '^[A-Za-z0-9][A-Za-z0-9 ._+/-]{0,23}$',
} as const;

/** Schéma JSON brut « measurementSet ». */
export const measurementSetJsonSchema = {
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
} as const;

/** Tous les schémas par clé, pour la validation à l'exécution (Ajv). */
export const jsonSchemas = {
  avatarOptions: avatarOptionsJsonSchema,
  createDesignRequest: createDesignRequestJsonSchema,
  createDesignVersionRequest: createDesignVersionRequestJsonSchema,
  cutPatternOptions: cutPatternOptionsJsonSchema,
  designExportRequest: designExportRequestJsonSchema,
  designVersionChanges: designVersionChangesJsonSchema,
  designVersionPage: designVersionPageJsonSchema,
  designVersionSummary: designVersionSummaryJsonSchema,
  designVersion: designVersionJsonSchema,
  design: designJsonSchema,
  drapeRequest: drapeRequestJsonSchema,
  drape: drapeJsonSchema,
  drapeJob: drapeJobJsonSchema,
  drapeResult: drapeResultJsonSchema,
  fabricBenchMeasurements: fabricBenchMeasurementsJsonSchema,
  fabricDerivedValues: fabricDerivedValuesJsonSchema,
  fabricPhysics: fabricPhysicsJsonSchema,
  fabricPresetReview: fabricPresetReviewJsonSchema,
  fabricValidationReport: fabricValidationReportJsonSchema,
  fabric: fabricJsonSchema,
  cloudEvent: cloudEventJsonSchema,
  designVersioned: designVersionedJsonSchema,
  drapeCompleted: drapeCompletedJsonSchema,
  drapeFailed: drapeFailedJsonSchema,
  drapeRequested: drapeRequestedJsonSchema,
  garmentRequest: garmentRequestJsonSchema,
  garmentSpec: garmentSpecJsonSchema,
  garmentType: garmentTypeJsonSchema,
  cutPatternRequest: cutPatternRequestJsonSchema,
  cutPattern: cutPatternJsonSchema,
  cuttingPlanRequest: cuttingPlanRequestJsonSchema,
  cuttingPlan: cuttingPlanJsonSchema,
  exportRequest: exportRequestJsonSchema,
  finishingOptions: finishingOptionsJsonSchema,
  gradedPatternRequest: gradedPatternRequestJsonSchema,
  gradedPattern: gradedPatternJsonSchema,
  sizeLabel: sizeLabelJsonSchema,
  measurementSet: measurementSetJsonSchema,
} as const;
