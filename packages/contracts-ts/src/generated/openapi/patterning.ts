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
  '/v1/patterns': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Calculer un patron */
    post: operations['draftPattern'];
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
    Problem: {
      /** @description Identifiant stable, ex. /problems/neckline-too-deep */
      type: string;
      title: string;
      status: number;
      detail?: string;
    };
    DraftPatternRequest: components['schemas']['create-design-version-request.schema'];
    /**
     * MeasurementSet
     * @description Mesures du corps d'un client (ISO 8559-1), en millimètres entiers. Une mesure facultative absente est estimée par le moteur de patronage, qui la liste dans GarmentSpec.estimatedMeasurements.
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
      /** @description Tour de poitrine sur les pointes de seins (ISO 8559-1 : bust girth). */
      bustGirthMm?: number;
      /** @description Tour de dessous de poitrine (ISO 8559-1 : underbust girth). */
      underBustGirthMm?: number;
      /** @description Hauteur de la vertèbre cervicale saillante depuis le sol (ISO 8559-1 : cervicale height). */
      cervicaleHeightMm?: number;
      /** @description Hauteur de la taille depuis le sol (ISO 8559-1 : waist height). */
      waistHeightMm?: number;
      /** @description Hauteur des hanches (tour le plus fort) depuis le sol (ISO 8559-1 : hip height). */
      hipHeightMm?: number;
      /** @description Longueur taille dos : de la cervicale à la taille, le long de la colonne (ISO 8559-1 : back waist length). */
      backWaistLengthMm?: number;
      /** @description Longueur taille devant : du point d'encolure à l'épaule à la taille, par la pointe de sein (ISO 8559-1 : front waist length). */
      frontWaistLengthMm?: number;
      /** @description Du point d'encolure à l'épaule à la pointe de sein (ISO 8559-1 : neck shoulder point to bust point). */
      neckShoulderToBustPointMm?: number;
      /** @description Écart entre les pointes de seins (ISO 8559-1 : bust point width). */
      bustPointWidthMm?: number;
      /** @description Carrure d'épaule à épaule, d'un point d'épaule à l'autre, par le dos (ISO 8559-1 : shoulder width). */
      shoulderWidthMm?: number;
      /** @description Profondeur d'emmanchure : de la ligne d'épaule au niveau du dessous de bras (ISO 8559-1 : armscye depth). */
      armscyeDepthMm?: number;
      /** @description Longueur de bras : du point d'épaule au poignet, coude légèrement plié (ISO 8559-1 : arm length). */
      armLengthMm?: number;
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
    CircleSkirtParams: {
      /** @description De la taille à l'ourlet. */
      lengthMm: number;
      /** @default 10 */
      waistEaseMm: number;
      /**
       * @description Fraction de cercle de l'ourlet : 1 pour un cercle entier, 0,5 pour un demi-cercle (suns de GarmentCode).
       * @default 1
       */
      circleFraction: number;
      /**
       * @description Hauteur de la ceinture ; 0 : sans ceinture.
       * @default 0
       */
      waistbandWidthMm: 0 | number;
    };
    TrousersParams: {
      /** @description De la taille à l'ourlet, sur le côté. */
      lengthMm: number;
      /** @default 10 */
      waistEaseMm: number;
      /** @default 50 */
      hipEaseMm: number;
      /** @description Tour du bas de jambe. Absent : jambe droite depuis le genou. */
      hemGirthMm?: number;
    };
    SleeveParams: {
      /** @description Du point d'épaule à l'ourlet. */
      lengthMm: number;
      /**
       * @description Embu de la tête de manche : la tête est plus longue que l'emmanchure de cette valeur.
       * @default 15
       */
      capEaseMm: number;
      /** @description Tour du bas de manche. Absent : valeur choisie par le tracé. */
      hemGirthMm?: number;
    };
    BodiceParams: {
      /**
       * @description Longueur sous la taille ; 0 : arrêt à la taille.
       * @default 0
       */
      lengthBelowWaistMm: number;
      /** @default 60 */
      bustEaseMm: number;
      /** @default 40 */
      waistEaseMm: number;
      /**
       * @description Creusement de l'encolure devant sous l'encolure naturelle ; 0 : encolure naturelle.
       * @default 0
       */
      frontNeckDepthMm: number;
      /**
       * @description Creusement de l'encolure dos sous l'encolure naturelle ; 0 : encolure naturelle.
       * @default 0
       */
      backNeckDepthMm: number;
      /** @description Manches. Absent : sans manches. */
      sleeve?: components['schemas']['SleeveParams'];
    };
    /** @description Jupe droite à pinces. */
    StraightSkirtRequest: {
      /** @constant */
      type: 'straight-skirt';
      params: components['schemas']['StraightSkirtParams'];
    };
    /** @description Jupe cercle (ou fraction de cercle). */
    CircleSkirtRequest: {
      /** @constant */
      type: 'circle-skirt';
      params: components['schemas']['CircleSkirtParams'];
    };
    /** @description Pantalon. */
    TrousersRequest: {
      /** @constant */
      type: 'trousers';
      params: components['schemas']['TrousersParams'];
    };
    /** @description Corsage, avec ou sans manches. */
    BodiceRequest: {
      /** @constant */
      type: 'bodice';
      params: components['schemas']['BodiceParams'];
    };
    /**
     * GarmentRequest
     * @description Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres, qui dépendent du type. Longueurs en millimètres.
     */
    'garment-request.schema': {
      $defs: {
        /** @description Jupe droite à pinces. */
        StraightSkirtRequest: {
          /** @constant */
          type: 'straight-skirt';
          params: components['schemas']['StraightSkirtParams'];
        };
        /** @description Jupe cercle (ou fraction de cercle). */
        CircleSkirtRequest: {
          /** @constant */
          type: 'circle-skirt';
          params: components['schemas']['CircleSkirtParams'];
        };
        /** @description Pantalon. */
        TrousersRequest: {
          /** @constant */
          type: 'trousers';
          params: components['schemas']['TrousersParams'];
        };
        /** @description Corsage, avec ou sans manches. */
        BodiceRequest: {
          /** @constant */
          type: 'bodice';
          params: components['schemas']['BodiceParams'];
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
        CircleSkirtParams: {
          /** @description De la taille à l'ourlet. */
          lengthMm: number;
          /** @default 10 */
          waistEaseMm: number;
          /**
           * @description Fraction de cercle de l'ourlet : 1 pour un cercle entier, 0,5 pour un demi-cercle (suns de GarmentCode).
           * @default 1
           */
          circleFraction: number;
          /**
           * @description Hauteur de la ceinture ; 0 : sans ceinture.
           * @default 0
           */
          waistbandWidthMm: 0 | number;
        };
        TrousersParams: {
          /** @description De la taille à l'ourlet, sur le côté. */
          lengthMm: number;
          /** @default 10 */
          waistEaseMm: number;
          /** @default 50 */
          hipEaseMm: number;
          /** @description Tour du bas de jambe. Absent : jambe droite depuis le genou. */
          hemGirthMm?: number;
        };
        BodiceParams: {
          /**
           * @description Longueur sous la taille ; 0 : arrêt à la taille.
           * @default 0
           */
          lengthBelowWaistMm: number;
          /** @default 60 */
          bustEaseMm: number;
          /** @default 40 */
          waistEaseMm: number;
          /**
           * @description Creusement de l'encolure devant sous l'encolure naturelle ; 0 : encolure naturelle.
           * @default 0
           */
          frontNeckDepthMm: number;
          /**
           * @description Creusement de l'encolure dos sous l'encolure naturelle ; 0 : encolure naturelle.
           * @default 0
           */
          backNeckDepthMm: number;
          /** @description Manches. Absent : sans manches. */
          sleeve?: components['schemas']['SleeveParams'];
        };
        SleeveParams: {
          /** @description Du point d'épaule à l'ourlet. */
          lengthMm: number;
          /**
           * @description Embu de la tête de manche : la tête est plus longue que l'emmanchure de cette valeur.
           * @default 15
           */
          capEaseMm: number;
          /** @description Tour du bas de manche. Absent : valeur choisie par le tracé. */
          hemGirthMm?: number;
        };
      };
    } & (
      | components['schemas']['StraightSkirtRequest']
      | components['schemas']['CircleSkirtRequest']
      | components['schemas']['TrousersRequest']
      | components['schemas']['BodiceRequest']
    );
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
    /** @description Emplacement d'un cran, seule définition partagée par Panel.notches (Notch) et la fabrication (NotchRequest) : sur la ligne de couture du bord edgeId, à distanceMm de son début (from), mesurée le long du bord. Ouvert pour être étendu (allOf) ; Notch et NotchRequest le ferment. */
    NotchPlacement: {
      edgeId: string;
      distanceMm: number;
      /**
       * @description Cran simple, double (dos, par convention) ou triple.
       * @default 1
       */
      count: number;
    };
    /** @description Cran d'une pièce : un emplacement (NotchPlacement) sur un de ses bords. */
    Notch: components['schemas']['NotchPlacement'];
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
      /** @description Crans posés par le moteur de patronage (tête de manche, ligne des hanches, milieux). */
      notches?: components['schemas']['Notch'][];
    };
    Seam: {
      id: string;
      a: components['schemas']['EdgeRef'];
      b: components['schemas']['EdgeRef'];
      /** @description Embu : le bord a est plus long que le bord b de cette valeur, qui se répartit en le cousant sur b (ex. tête de manche). Absent : 0, les deux bords ont la même longueur. */
      easeMm?: number;
    };
    /**
     * GarmentSpec
     * @description Spécification de patron, format pivot de la plateforme (inspiré de GarmentCode). Coordonnées en millimètres, y vers le haut, pièces à plat, vues côté endroit du tissu, contour dans le sens trigonométrique.
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
      /** @description Mesures absentes de la demande, estimées par le moteur : noms de champs de MeasurementSet (ex. bustGirthMm). Absent ou vide : aucune estimation. */
      estimatedMeasurements?: string[];
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
          /** @description Crans posés par le moteur de patronage (tête de manche, ligne des hanches, milieux). */
          notches?: components['schemas']['Notch'][];
        };
        EdgeRef: {
          panelId: string;
          edgeId: string;
        };
        Seam: {
          id: string;
          a: components['schemas']['EdgeRef'];
          b: components['schemas']['EdgeRef'];
          /** @description Embu : le bord a est plus long que le bord b de cette valeur, qui se répartit en le cousant sur b (ex. tête de manche). Absent : 0, les deux bords ont la même longueur. */
          easeMm?: number;
        };
        /** @description Emplacement d'un cran, seule définition partagée par Panel.notches (Notch) et la fabrication (NotchRequest) : sur la ligne de couture du bord edgeId, à distanceMm de son début (from), mesurée le long du bord. Ouvert pour être étendu (allOf) ; Notch et NotchRequest le ferment. */
        NotchPlacement: {
          edgeId: string;
          distanceMm: number;
          /**
           * @description Cran simple, double (dos, par convention) ou triple.
           * @default 1
           */
          count: number;
        };
        /** @description Cran d'une pièce : un emplacement (NotchPlacement) sur un de ses bords. */
        Notch: components['schemas']['NotchPlacement'];
      };
    };
  };
  responses: {
    /** @description Entrées valides mais impossibles à tracer, au format RFC 9457. Types stables : /problems/measurement-required (mesure obligatoire absente pour ce vêtement ; le détail cite le champ, jamais sa valeur), /problems/inconsistent-measurements (mesures données et estimées incohérentes entre elles), /problems/garment-type-not-supported (type de vêtement pas encore tracé par cette version du moteur), /problems/skirt-shorter-than-hip-depth (jupe droite plus courte que la ligne des hanches), /problems/trousers-shorter-than-crotch (pantalon trop court sous l'entrejambe), /problems/trousers-hem-too-narrow (tour d'ourlet trop petit pour la jambe), /problems/neckline-too-deep (encolure creusée sous la ligne de poitrine ou sous l'aisselle), /problems/sleeve-shorter-than-cap (manche plus courte que sa tête), /problems/curve-tangents-parallel et /problems/curve-tangents-diverge (courbe impossible à construire avec ces valeurs). Le détail ne contient jamais de valeur de mesure. Un nouveau type est un ajout compatible ; un type ne change jamais de sens. Une requête hors schéma reçoit la réponse 422 de validation de FastAPI (sans type /problems/), qui peut recopier les valeurs reçues : elle ne se relaie ni ne se journalise. */
    DraftingProblem: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/problem+json': components['schemas']['Problem'];
      };
    };
  };
  parameters: never;
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
      /** @description Le moteur répond. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            /** @enum {string} */
            status: 'ok';
            engineVersion: string;
          };
        };
      };
    };
  };
  draftPattern: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['create-design-version-request.schema'];
      };
    };
    responses: {
      /** @description La spécification de patron. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['garment-spec.schema'];
        };
      };
      422: components['responses']['DraftingProblem'];
    };
  };
}
