// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
