// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
