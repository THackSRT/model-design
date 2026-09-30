// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
export interface paths {
  '/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getHealth'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Créer un modèle */
    post: operations['createDesign'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
      };
      cookie?: never;
    };
    /** Lire un modèle */
    get: operations['getDesign'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}/versions': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
      };
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Créer une version (calcule le patron)
     * @description Appelle le moteur de patronage avec les mesures et les paramètres, puis enregistre la version et sa spécification de patron. Mêmes entrées, même empreinte.
     */
    post: operations['createDesignVersion'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}/versions/{versionNumber}': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: number;
      };
      cookie?: never;
    };
    /** Lire une version */
    get: operations['getDesignVersion'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    Health: {
      /** @enum {string} */
      status: 'ok';
    };
    Problem: {
      /** @description Identifiant stable, ex. /problems/design-not-found */
      type: string;
      title: string;
      status: number;
      detail?: string;
    };
    CreateDesignRequest: components['schemas']['create-design-request.schema'];
    Design: components['schemas']['design.schema'];
    CreateDesignVersionRequest: components['schemas']['create-design-version-request.schema'];
    DesignVersion: components['schemas']['design-version.schema'];
    /** CreateDesignRequest */
    'create-design-request.schema': {
      name: string;
      /** @enum {string} */
      garmentType: 'straight-skirt';
    };
    /** Design */
    'design.schema': {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      organizationId: string;
      name: string;
      /** @enum {string} */
      garmentType: 'straight-skirt';
      /** Format: date-time */
      createdAt: string;
      /** @description 0 tant qu'aucune version n'existe. */
      latestVersionNumber: number;
    };
    /**
     * MeasurementSet
     * @description Mesures du corps d'un client (ISO 8559-1), en millimètres entiers.
     */
    'measurement-set.schema': {
      /** @enum {string} */
      sex: 'female' | 'male';
      statureMm: number;
      neckGirthMm?: number;
      chestGirthMm: number;
      waistGirthMm: number;
      hipGirthMm: number;
      upperArmGirthMm?: number;
      wristGirthMm?: number;
      thighGirthMm?: number;
      kneeGirthMm?: number;
      calfGirthMm?: number;
      ankleGirthMm?: number;
      crotchHeightMm?: number;
    };
    StraightSkirtParams: {
      lengthMm: number;
      /** @default 10 */
      waistEaseMm: number;
      /** @default 40 */
      hipEaseMm: number;
      /** @default 0 */
      hemFlareMm: number;
    };
    /**
     * GarmentRequest
     * @description Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres.
     */
    'garment-request.schema': {
      /** @enum {string} */
      type: 'straight-skirt';
      params: components['schemas']['StraightSkirtParams'];
      $defs: {
        StraightSkirtParams: {
          lengthMm: number;
          /** @default 10 */
          waistEaseMm: number;
          /** @default 40 */
          hipEaseMm: number;
          /** @default 0 */
          hemFlareMm: number;
        };
      };
    };
    /** CreateDesignVersionRequest */
    'create-design-version-request.schema': {
      measurements: components['schemas']['measurement-set.schema'];
      garment: components['schemas']['garment-request.schema'];
    };
    /** @description [x, y] en millimètres. */
    Point: number[];
    Edge: {
      id: string;
      from: components['schemas']['Point'];
      to: components['schemas']['Point'];
      /** @description Points de contrôle d'une courbe de Bézier (1 : quadratique, 2 : cubique). Absent : segment droit. */
      controls?: components['schemas']['Point'][];
      /** @enum {string} */
      role?: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
    };
    EdgeRef: {
      panelId: string;
      edgeId: string;
    };
    Panel: {
      id: string;
      name: string;
      /** @description Contour fermé, dans le sens trigonométrique : la fin de chaque bord est le début du suivant. */
      edges: components['schemas']['Edge'][];
      /** @description Droit fil : deux points. */
      grainline?: components['schemas']['Point'][];
      /** @description Nombre de pièces à couper. */
      quantity: number;
      /** @default false */
      cutOnFold: boolean;
    };
    Seam: {
      id: string;
      a: components['schemas']['EdgeRef'];
      b: components['schemas']['EdgeRef'];
    };
    /**
     * GarmentSpec
     * @description Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat.
     */
    'garment-spec.schema': {
      /** @constant */
      specVersion: '1.0';
      /** @constant */
      unit: 'mm';
      engine: {
        name: string;
        version: string;
      };
      garment: {
        type: string;
      };
      panels: components['schemas']['Panel'][];
      seams: components['schemas']['Seam'][];
      $defs: {
        /** @description [x, y] en millimètres. */
        Point: number[];
        Edge: {
          id: string;
          from: components['schemas']['Point'];
          to: components['schemas']['Point'];
          /** @description Points de contrôle d'une courbe de Bézier (1 : quadratique, 2 : cubique). Absent : segment droit. */
          controls?: components['schemas']['Point'][];
          /** @enum {string} */
          role?: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
        };
        Panel: {
          id: string;
          name: string;
          /** @description Contour fermé, dans le sens trigonométrique : la fin de chaque bord est le début du suivant. */
          edges: components['schemas']['Edge'][];
          /** @description Droit fil : deux points. */
          grainline?: components['schemas']['Point'][];
          /** @description Nombre de pièces à couper. */
          quantity: number;
          /** @default false */
          cutOnFold: boolean;
        };
        EdgeRef: {
          panelId: string;
          edgeId: string;
        };
        Seam: {
          id: string;
          a: components['schemas']['EdgeRef'];
          b: components['schemas']['EdgeRef'];
        };
      };
    };
    /** DesignVersion */
    'design-version.schema': {
      /** Format: uuid */
      designId: string;
      number: number;
      /** Format: date-time */
      createdAt: string;
      measurements: components['schemas']['measurement-set.schema'];
      garment: components['schemas']['garment-request.schema'];
      fingerprint: string;
      spec: components['schemas']['garment-spec.schema'];
    };
  };
  responses: {
    /** @description Erreur au format RFC 9457. */
    Problem: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/problem+json': components['schemas']['Problem'];
      };
    };
  };
  parameters: {
    DesignId: string;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  getHealth: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Le service répond. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Health'];
        };
      };
    };
  };
  createDesign: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['create-design-request.schema'];
      };
    };
    responses: {
      /** @description Modèle créé. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design.schema'];
        };
      };
      400: components['responses']['Problem'];
    };
  };
  getDesign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Le modèle. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design.schema'];
        };
      };
      404: components['responses']['Problem'];
    };
  };
  createDesignVersion: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['create-design-version-request.schema'];
      };
    };
    responses: {
      /** @description Version créée. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design-version.schema'];
        };
      };
      400: components['responses']['Problem'];
      404: components['responses']['Problem'];
      422: components['responses']['Problem'];
      502: components['responses']['Problem'];
    };
  };
  getDesignVersion: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: number;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description La version et son patron. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design-version.schema'];
        };
      };
      404: components['responses']['Problem'];
    };
  };
}
