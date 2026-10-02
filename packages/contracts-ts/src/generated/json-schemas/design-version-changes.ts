// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
