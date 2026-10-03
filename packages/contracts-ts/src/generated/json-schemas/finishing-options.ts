// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
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
