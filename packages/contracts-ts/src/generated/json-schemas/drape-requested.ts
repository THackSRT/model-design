// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
/** Schéma JSON brut « drapeRequested ». */
export const drapeRequestedJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://atelier.example/schemas/events/drape-requested.schema.json',
  title: 'DrapeRequested',
  description:
    "Données de l'événement drape.requested : une tâche de drapé (DrapeJob). Contient des mesures : jamais journalisée.",
  $ref: '../drape/drape-job.schema.json',
} as const;
