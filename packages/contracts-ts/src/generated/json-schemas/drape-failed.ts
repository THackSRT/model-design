// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
