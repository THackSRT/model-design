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
      description:
        "Écart du bras à la verticale, en degrés (0 : le long du corps ; 90 : à l'horizontale, pose en T). Défaut : 9 (ADR 0018).",
      minimum: 0,
      maximum: 90,
      default: 9,
    },
  },
} as const;
