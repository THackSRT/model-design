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
  '/v1/designs/{designId}/versions/{versionNumber}/cut-patterns': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
      };
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Calculer les pièces de coupe d'une version
     * @description Envoie la spécification de patron de la version au moteur de fabrication (ADR 0012) et rend ses pièces de coupe. Rien n'est enregistré : mêmes entrées, même version du moteur, même résultat.
     */
    post: operations['createVersionCutPattern'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}/versions/{versionNumber}/exports': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
      };
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Exporter les pièces de coupe d'une version (SVG 1:1, PDF A4 tuilé, DXF-AAMA) */
    post: operations['createVersionExport'];
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
    CutPatternOptions: components['schemas']['cut-pattern-options.schema'];
    DesignExportRequest: components['schemas']['design-export-request.schema'];
    CutPattern: components['schemas']['cut-pattern.schema'];
    /**
     * GarmentType
     * @description Type de vêtement connu de la plateforme (ADR 0010). Même valeur que GarmentRequest.type. Un type dont le tracé n'est pas encore livré est refusé par le moteur de patronage (problème garment-type-not-supported).
     * @enum {string}
     */
    'garment-type.schema': 'straight-skirt' | 'circle-skirt' | 'trousers' | 'bodice';
    /** CreateDesignRequest */
    'create-design-request.schema': {
      name: string;
      garmentType: components['schemas']['garment-type.schema'];
    };
    /** Design */
    'design.schema': {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      organizationId: string;
      name: string;
      garmentType: components['schemas']['garment-type.schema'];
      /** Format: date-time */
      createdAt: string;
      /** @description 0 tant qu'aucune version n'existe. */
      latestVersionNumber: number;
    };
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
    /** @description Valeur de couture par rôle de bord (voir Edge.role de GarmentSpec). Un bord sans rôle est traité comme une couture (seam). */
    RoleAllowances: {
      seam?: number;
      hem?: number;
      waistline?: number;
      opening?: number;
    };
    EdgeAllowance: {
      panelId: string;
      edgeId: string;
      allowanceMm: number;
    };
    /** @description Priorité : byEdge, puis byRole, puis defaultMm. Un bord de pliure (role fold) n'a jamais de valeur de couture. Si seamAllowances est absent, le moteur applique defaultMm = 10 et byRole.hem = 30. */
    SeamAllowances: {
      /** @default 10 */
      defaultMm: number;
      byRole?: components['schemas']['RoleAllowances'];
      byEdge?: components['schemas']['EdgeAllowance'][];
    };
    /** @description Cran demandé sur la pièce panelId : un emplacement (NotchPlacement de GarmentSpec : edgeId, distanceMm, count) sur la ligne de couture d'un de ses bords. */
    NotchRequest: {
      panelId: string;
    } & components['schemas']['NotchPlacement'];
    /**
     * FinishingOptions
     * @description Comment finir les pièces d'un patron : valeurs de couture et crans. Longueurs en millimètres. Absent : valeurs par défaut du moteur (10 mm partout, 30 mm aux ourlets, crans aux raccords de couture).
     */
    'finishing-options.schema': {
      seamAllowances?: components['schemas']['SeamAllowances'];
      /** @description Crans demandés en plus des crans automatiques. */
      notches?: components['schemas']['NotchRequest'][];
      /**
       * @description none : aucun cran automatique. seam-junctions : un cran à chaque jonction de deux bords cousus presque alignés (écart de direction inférieur à 30°), par exemple la ligne de hanches d'une couture de côté, et un cran aux deux extrémités de chaque pince (pince franchie par la ligne de coupe).
       * @default seam-junctions
       * @enum {string}
       */
      autoNotches: 'none' | 'seam-junctions';
      $defs: {
        /** @description Priorité : byEdge, puis byRole, puis defaultMm. Un bord de pliure (role fold) n'a jamais de valeur de couture. Si seamAllowances est absent, le moteur applique defaultMm = 10 et byRole.hem = 30. */
        SeamAllowances: {
          /** @default 10 */
          defaultMm: number;
          byRole?: components['schemas']['RoleAllowances'];
          byEdge?: components['schemas']['EdgeAllowance'][];
        };
        /** @description Valeur de couture par rôle de bord (voir Edge.role de GarmentSpec). Un bord sans rôle est traité comme une couture (seam). */
        RoleAllowances: {
          seam?: number;
          hem?: number;
          waistline?: number;
          opening?: number;
        };
        EdgeAllowance: {
          panelId: string;
          edgeId: string;
          allowanceMm: number;
        };
        /** @description Cran demandé sur la pièce panelId : un emplacement (NotchPlacement de GarmentSpec : edgeId, distanceMm, count) sur la ligne de couture d'un de ses bords. */
        NotchRequest: {
          panelId: string;
        } & components['schemas']['NotchPlacement'];
      };
    };
    /**
     * SizeLabel
     * @description Nom de taille ou repère court (« 38 », « M », « MOD-002 »). Jeu de caractères restreint : il est écrit tel quel dans les exports (SVG, PDF, DXF). Jamais de nom de client.
     */
    'size-label.schema': string;
    /**
     * CutPatternOptions
     * @description Comment finir les pièces d'une version de modèle. Corps vide ({}) : valeurs par défaut du moteur de fabrication (10 mm partout, 30 mm aux ourlets, crans aux raccords). Longueurs en millimètres.
     */
    'cut-pattern-options.schema': {
      finishing?: components['schemas']['finishing-options.schema'];
      /** @description Taille ou repère reporté sur les pièces. Jamais de nom de client. */
      sizeLabel?: components['schemas']['size-label.schema'];
    };
    SeamLineEdge: {
      edgeId: string;
      /**
       * @description Rôle du bord (Edge.role de GarmentSpec ; seam si absent).
       * @enum {string}
       */
      role: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
      /** @description Valeur de couture appliquée à ce bord (0 pour une pliure). */
      allowanceMm: number;
      /** @description Polyligne du bord (courbe de Bézier aplatie), du début à la fin. */
      points: components['schemas']['Point'][];
    };
    /** @description Segment de deux points. */
    Segment: components['schemas']['Point'][];
    NotchMark: {
      edgeId: string;
      /** @description Distance le long de la ligne de couture depuis le début du bord. */
      distanceMm: number;
      count: number;
      /** @enum {string} */
      source?: 'requested' | 'auto';
      /** @description Point de la ligne de couture repéré par le cran. */
      position: components['schemas']['Point'];
      /** @description Entailles à couper (une par cran), de la ligne de coupe vers l'intérieur de la pièce. */
      segments: components['schemas']['Segment'][];
    };
    /** @description Rectangle englobant de la ligne de coupe. */
    Bounds: {
      min: components['schemas']['Point'];
      max: components['schemas']['Point'];
    };
    EngineRef: {
      name: string;
      version: string;
    };
    CutPiece: {
      panelId: string;
      name: string;
      /** @description Nombre de pièces à couper par vêtement (Panel.quantity). */
      quantity: number;
      /** @description Vrai : la pièce est dessinée à moitié et se coupe sur la pliure du tissu (voir foldLine). */
      cutOnFold: boolean;
      /** @description Ligne de coupe : polygone fermé (le dernier point rejoint le premier, sans être répété), sens trigonométrique, courbes aplaties. */
      cutLine: components['schemas']['Point'][];
      /** @description Ligne de couture, bord par bord, dans l'ordre de Panel.edges ; la fin de chaque bord est le début du suivant. */
      seamLine: components['schemas']['SeamLineEdge'][];
      notches: components['schemas']['NotchMark'][];
      /** @description Droit fil : celui de la spécification, ou, s'il manque, une ligne verticale (axe y de la pièce) au centre de la pièce. */
      grainline: components['schemas']['Segment'];
      /** @description Ligne de pliure (bord de rôle fold), présente si cutOnFold est vrai. */
      foldLine?: components['schemas']['Segment'];
      /** @description Point intérieur à la pièce où placer son étiquette. */
      labelAnchor: components['schemas']['Point'];
      bounds: components['schemas']['Bounds'];
      /** @description Aire de la ligne de coupe, en mm², telle que dessinée (moitié de pièce si cutOnFold). */
      cutAreaMm2: number;
    };
    /**
     * CutPattern
     * @description Pièces de coupe : chaque pièce du patron avec sa ligne de couture, sa ligne de coupe (valeurs de couture ajoutées), ses crans, son droit fil et sa pliure. Coordonnées en millimètres dans le repère de la pièce de GarmentSpec (y vers le haut), arrondies à 0,01 mm.
     */
    'cut-pattern.schema': {
      /** @constant */
      unit: 'mm';
      engine: components['schemas']['EngineRef'];
      /** @description Moteur qui a calculé la spécification d'entrée (GarmentSpec.engine). */
      specEngine: components['schemas']['EngineRef'];
      garment: {
        type: string;
      };
      sizeLabel?: components['schemas']['size-label.schema'];
      pieces: components['schemas']['CutPiece'][];
      $defs: {
        EngineRef: {
          name: string;
          version: string;
        };
        /** @description Segment de deux points. */
        Segment: components['schemas']['Point'][];
        CutPiece: {
          panelId: string;
          name: string;
          /** @description Nombre de pièces à couper par vêtement (Panel.quantity). */
          quantity: number;
          /** @description Vrai : la pièce est dessinée à moitié et se coupe sur la pliure du tissu (voir foldLine). */
          cutOnFold: boolean;
          /** @description Ligne de coupe : polygone fermé (le dernier point rejoint le premier, sans être répété), sens trigonométrique, courbes aplaties. */
          cutLine: components['schemas']['Point'][];
          /** @description Ligne de couture, bord par bord, dans l'ordre de Panel.edges ; la fin de chaque bord est le début du suivant. */
          seamLine: components['schemas']['SeamLineEdge'][];
          notches: components['schemas']['NotchMark'][];
          /** @description Droit fil : celui de la spécification, ou, s'il manque, une ligne verticale (axe y de la pièce) au centre de la pièce. */
          grainline: components['schemas']['Segment'];
          /** @description Ligne de pliure (bord de rôle fold), présente si cutOnFold est vrai. */
          foldLine?: components['schemas']['Segment'];
          /** @description Point intérieur à la pièce où placer son étiquette. */
          labelAnchor: components['schemas']['Point'];
          bounds: components['schemas']['Bounds'];
          /** @description Aire de la ligne de coupe, en mm², telle que dessinée (moitié de pièce si cutOnFold). */
          cutAreaMm2: number;
        };
        SeamLineEdge: {
          edgeId: string;
          /**
           * @description Rôle du bord (Edge.role de GarmentSpec ; seam si absent).
           * @enum {string}
           */
          role: 'seam' | 'fold' | 'hem' | 'waistline' | 'opening';
          /** @description Valeur de couture appliquée à ce bord (0 pour une pliure). */
          allowanceMm: number;
          /** @description Polyligne du bord (courbe de Bézier aplatie), du début à la fin. */
          points: components['schemas']['Point'][];
        };
        NotchMark: {
          edgeId: string;
          /** @description Distance le long de la ligne de couture depuis le début du bord. */
          distanceMm: number;
          count: number;
          /** @enum {string} */
          source?: 'requested' | 'auto';
          /** @description Point de la ligne de couture repéré par le cran. */
          position: components['schemas']['Point'];
          /** @description Entailles à couper (une par cran), de la ligne de coupe vers l'intérieur de la pièce. */
          segments: components['schemas']['Segment'][];
        };
        /** @description Rectangle englobant de la ligne de coupe. */
        Bounds: {
          min: components['schemas']['Point'];
          max: components['schemas']['Point'];
        };
      };
    };
    /**
     * @description svg : une planche à l'échelle 1:1 (unités mm). pdf-a4-tiled : la même planche découpée en pages A4 à assembler, précédées d'un plan d'assemblage avec un carré de contrôle de 100 mm. dxf-aama : DXF R12 selon AAMA-DXF (ASTM D6673), une taille, pour les logiciels de CAO et les tables de coupe.
     * @enum {string}
     */
    ExportFormat: 'svg' | 'pdf-a4-tiled' | 'dxf-aama';
    /**
     * DesignExportRequest
     * @description Demande d'export des pièces de coupe d'une version de modèle, à l'échelle 1:1. La spécification de patron est celle de la version : le client ne l'envoie pas. La réponse est le fichier lui-même.
     */
    'design-export-request.schema': {
      format: components['schemas']['ExportFormat'];
      finishing?: components['schemas']['finishing-options.schema'];
      /** @description Taille écrite sur chaque pièce et dans le nom du fichier. Jamais de nom de client. */
      sizeLabel?: components['schemas']['size-label.schema'];
      /** @description Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client. */
      reference?: components['schemas']['size-label.schema'];
    };
  };
  responses: {
    /** @description Erreur au format RFC 9457. 502 /problems/engine-unavailable : moteur injoignable, trop lent (délai dépassé), réponse hors contrat ou requête refusée par sa validation. */
    Problem: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/problem+json': components['schemas']['Problem'];
      };
    };
    /** @description Pièces impossibles à finir avec ces options, au format RFC 9457. Le service relaie le type stable du moteur de fabrication (contracts/openapi/manufacturing.yaml), seulement s'il est dans cette liste : /problems/unknown-edge, /problems/allowance-on-fold, /problems/allowance-on-dart, /problems/adjacent-darts, /problems/notch-outside-edge, /problems/open-contour, /problems/fold-edge-missing, /problems/cut-line-self-intersects, /problems/export-format-unavailable. Tout autre type, ou une erreur de validation du moteur, devient 502 /problems/engine-unavailable. Le détail est relayé ; il ne contient jamais de mesure. */
    ManufacturingProblem: {
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
    VersionNumber: number;
  };
  requestBodies: never;
  headers: {
    /** @description Pièces et fichiers dérivés des mesures d'un client : jamais gardés par le navigateur ni par un intermédiaire. */
    NoStore: 'no-store';
  };
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
  createVersionCutPattern: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['cut-pattern-options.schema'];
      };
    };
    responses: {
      /** @description Les pièces de coupe (mm). */
      200: {
        headers: {
          'Cache-Control': components['headers']['NoStore'];
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['cut-pattern.schema'];
        };
      };
      400: components['responses']['Problem'];
      404: components['responses']['Problem'];
      422: components['responses']['ManufacturingProblem'];
      502: components['responses']['Problem'];
    };
  };
  createVersionExport: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['design-export-request.schema'];
      };
    };
    responses: {
      /** @description Le fichier, dans le type de contenu du format demandé : image/svg+xml (svg), application/pdf (pdf-a4-tiled), image/vnd.dxf (dxf-aama). Type de contenu et nom de fichier sont fixés par le service, jamais recopiés de la réponse du moteur. */
      200: {
        headers: {
          /** @description attachment; filename="<garmentType>-v<versionNumber>[-<sizeLabel>].<svg|pdf|dxf>", où sizeLabel est réduit à [a-z0-9-] ; jamais de nom de modèle ni de client. */
          'Content-Disposition'?: string;
          'Cache-Control': components['headers']['NoStore'];
          'X-Content-Type-Options'?: 'nosniff';
          [name: string]: unknown;
        };
        content: {
          'image/svg+xml': string;
          'application/pdf': string;
          'image/vnd.dxf': string;
        };
      };
      400: components['responses']['Problem'];
      404: components['responses']['Problem'];
      422: components['responses']['ManufacturingProblem'];
      502: components['responses']['Problem'];
    };
  };
}
