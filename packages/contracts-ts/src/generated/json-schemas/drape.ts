// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
