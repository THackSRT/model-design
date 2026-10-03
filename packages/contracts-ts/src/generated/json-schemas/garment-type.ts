// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
