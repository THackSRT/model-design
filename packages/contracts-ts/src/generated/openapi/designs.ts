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
    /**
     * Lister les versions d'un modèle (résumés, la plus récente d'abord)
     * @description Résumés seulement : ni mesures ni patron (lire une version pour les obtenir). Ordre : numéro décroissant. Pagination par curseur : rappeler avec cursor = nextCursor tant que nextCursor est présent.
     */
    get: operations['listDesignVersions'];
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
    /**
     * Lire une version
     * @description Mesures du client comprises : réservée à l'organisation propriétaire du modèle (404 sinon).
     */
    get: operations['getDesignVersion'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}/versions/{versionNumber}/changes': {
    parameters: {
      query: {
        /** @description Numéro de la version de référence (avant ou après versionNumber). */
        since: number;
      };
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
      };
      cookie?: never;
    };
    /**
     * Comparer une version à une autre (paramètres et mesures)
     * @description Ce qui change des entrées entre la version since et la version versionNumber : paramètres du vêtement et mesures, valeurs telles qu'envoyées (sans appliquer les défauts). Les mesures du client n'y figurent que pour l'organisation propriétaire (404 sinon). La géométrie (pièces, aires, périmètres) n'est pas comparée ici : le client la compare depuis les spécifications des deux versions (ADR 0014).
     */
    get: operations['getDesignVersionChanges'];
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
  '/v1/designs/{designId}/versions/{versionNumber}/drapes': {
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
     * Demander le drapé d'une version (tâche asynchrone)
     * @description Enregistre un drapé pending et écrit drape.requested dans l'outbox, dans la même transaction (ADR 0013) ; le calcul prend 5 à 60 s. Même demande canonique (empreinte SHA-256) sur la même version : le drapé existant est rendu (200), sauf s'il a échoué. Suivre l'état par GET …/drapes/{drapeId}.
     */
    post: operations['createVersionDrape'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}/versions/{versionNumber}/drapes/{drapeId}': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
        drapeId: components['parameters']['DrapeId'];
      };
      cookie?: never;
    };
    /**
     * Lire l'état d'un drapé
     * @description Réservé à l'organisation propriétaire du modèle (404 sinon). Le studio interroge toutes les 2 s tant que status vaut pending. Types d'erreur stables d'un drapé failed (problemType) : /problems/drape-placement-missing, /problems/drape-placement-failed, /problems/drape-seam-not-closed, /problems/drape-body-penetration, /problems/drape-too-large, /problems/drape-internal (relayés de drape.failed), /problems/drape-timeout (encore pending 10 minutes après createdAt).
     */
    get: operations['getVersionDrape'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/designs/{designId}/versions/{versionNumber}/drapes/{drapeId}/model': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
        drapeId: components['parameters']['DrapeId'];
      };
      cookie?: never;
    };
    /**
     * Lire le modèle 3D d'un drapé (glTF 2.0 binaire, vêtement seul)
     * @description Lu dans le seau privé par le service, après vérification de l'organisation (404 sinon) ; jamais d'URL publique. Le fichier révèle la silhouette du client. Positions en mètres (unité imposée par glTF).
     */
    get: operations['getVersionDrapeModel'];
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
    DesignVersionSummary: components['schemas']['design-version-summary.schema'];
    DesignVersionPage: components['schemas']['design-version-page.schema'];
    DesignVersionChanges: components['schemas']['design-version-changes.schema'];
    CutPatternOptions: components['schemas']['cut-pattern-options.schema'];
    DesignExportRequest: components['schemas']['design-export-request.schema'];
    CutPattern: components['schemas']['cut-pattern.schema'];
    DrapeRequest: components['schemas']['drape-request.schema'];
    Drape: components['schemas']['drape.schema'];
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
    /**
     * DesignVersionSummary
     * @description Résumé d'une version de modèle, pour une liste : ni mesures du client ni patron (lire la version pour les obtenir). Longueurs des paramètres en millimètres.
     */
    'design-version-summary.schema': {
      number: number;
      /** Format: date-time */
      createdAt: string;
      fingerprint: string;
      /** @description Version du moteur de patronage qui a tracé le patron (spec.engine.version). */
      engineVersion: string;
      /** @description Type de vêtement et paramètres demandés, tels qu'envoyés. */
      garment: components['schemas']['garment-request.schema'];
    };
    /**
     * DesignVersionPage
     * @description Une page de résumés de versions d'un modèle, par numéro décroissant (la plus récente d'abord).
     */
    'design-version-page.schema': {
      /** Format: uuid */
      designId: string;
      items: components['schemas']['design-version-summary.schema'][];
      /** @description Curseur opaque de la page suivante (versions plus anciennes). Absent : dernière page. */
      nextCursor?: string;
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
    /** @description Pose de la pièce autour du corps, pour l'habillage et le drapé (ADR 0013). Facultative : sans elle, la pièce ne peut pas être drapée. Une pièce cutOnFold est dépliée par symétrie sur son bord de rôle fold, sa moitié dessinée allant du côté bodySide. Une pièce quantity: 2 donne deux exemplaires : une copie telle que dessinée du côté bodySide et une copie retournée (miroir) de l'autre côté du porteur. */
    PanelPlacement: {
      /**
       * @description Partie du corps autour de laquelle la pièce s'enroule.
       * @enum {string}
       */
      zone: 'torso' | 'leg' | 'arm';
      /**
       * @description Côté du porteur (sa gauche, sa droite, ou à cheval sur le milieu) où va la pièce telle que dessinée.
       * @enum {string}
       */
      bodySide: 'left' | 'right' | 'center';
      /**
       * @description Face du corps vers laquelle regarde l'endroit de la pièce ; outer pour une pièce enroulée autour d'un membre.
       * @enum {string}
       */
      facing: 'front' | 'back' | 'outer';
      /** @description Point de la pièce posé sur la ligne médiane de la face facing, à la hauteur du repère landmark plus offsetMm. */
      anchor: {
        point: components['schemas']['Point'];
        /**
         * @description Repère de hauteur du corps ajusté.
         * @enum {string}
         */
        landmark: 'neck' | 'shoulder' | 'waist' | 'hip' | 'crotch' | 'knee' | 'ankle' | 'wrist';
        /**
         * @description Décalage vertical depuis le repère, en millimètres, positif vers le haut.
         * @default 0
         */
        offsetMm: number;
      };
      /**
       * @description Distance au corps de la position de départ, en millimètres.
       * @default 30
       */
      clearanceMm: number;
    };
    EdgeRef: {
      panelId: string;
      edgeId: string;
      /**
       * @description Exemplaire du bord à coudre, côté du porteur, quand la règle de la couture (Seam) ne suffit pas. Absent : règle de Seam.
       * @enum {string}
       */
      side?: 'left' | 'right';
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
      placement?: components['schemas']['PanelPlacement'];
    };
    /** @description Couture entre deux bords. Convention, une fois les pièces dépliées (cutOnFold) et les copies retournées (quantity: 2) posées (PanelPlacement) : a se coud de son début (from) vers sa fin sur b de sa fin vers son début (sens opposés). Une couture entre deux bords présents des deux côtés du porteur est dupliquée côté par côté (gauche avec gauche, droite avec droite) ; entre un bord présent des deux côtés et un bord d'un seul côté, elle prend la copie de ce côté. EdgeRef.side force la copie quand la règle ne suffit pas. */
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
          placement?: components['schemas']['PanelPlacement'];
        };
        /** @description Pose de la pièce autour du corps, pour l'habillage et le drapé (ADR 0013). Facultative : sans elle, la pièce ne peut pas être drapée. Une pièce cutOnFold est dépliée par symétrie sur son bord de rôle fold, sa moitié dessinée allant du côté bodySide. Une pièce quantity: 2 donne deux exemplaires : une copie telle que dessinée du côté bodySide et une copie retournée (miroir) de l'autre côté du porteur. */
        PanelPlacement: {
          /**
           * @description Partie du corps autour de laquelle la pièce s'enroule.
           * @enum {string}
           */
          zone: 'torso' | 'leg' | 'arm';
          /**
           * @description Côté du porteur (sa gauche, sa droite, ou à cheval sur le milieu) où va la pièce telle que dessinée.
           * @enum {string}
           */
          bodySide: 'left' | 'right' | 'center';
          /**
           * @description Face du corps vers laquelle regarde l'endroit de la pièce ; outer pour une pièce enroulée autour d'un membre.
           * @enum {string}
           */
          facing: 'front' | 'back' | 'outer';
          /** @description Point de la pièce posé sur la ligne médiane de la face facing, à la hauteur du repère landmark plus offsetMm. */
          anchor: {
            point: components['schemas']['Point'];
            /**
             * @description Repère de hauteur du corps ajusté.
             * @enum {string}
             */
            landmark: 'neck' | 'shoulder' | 'waist' | 'hip' | 'crotch' | 'knee' | 'ankle' | 'wrist';
            /**
             * @description Décalage vertical depuis le repère, en millimètres, positif vers le haut.
             * @default 0
             */
            offsetMm: number;
          };
          /**
           * @description Distance au corps de la position de départ, en millimètres.
           * @default 30
           */
          clearanceMm: number;
        };
        EdgeRef: {
          panelId: string;
          edgeId: string;
          /**
           * @description Exemplaire du bord à coudre, côté du porteur, quand la règle de la couture (Seam) ne suffit pas. Absent : règle de Seam.
           * @enum {string}
           */
          side?: 'left' | 'right';
        };
        /** @description Couture entre deux bords. Convention, une fois les pièces dépliées (cutOnFold) et les copies retournées (quantity: 2) posées (PanelPlacement) : a se coud de son début (from) vers sa fin sur b de sa fin vers son début (sens opposés). Une couture entre deux bords présents des deux côtés du porteur est dupliquée côté par côté (gauche avec gauche, droite avec droite) ; entre un bord présent des deux côtés et un bord d'un seul côté, elle prend la copie de ce côté. EdgeRef.side force la copie quand la règle ne suffit pas. */
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
    ParamChange: {
      /** @description Chemin du paramètre dans GarmentRequest.params, points entre les niveaux (ex. lengthMm, sleeve.capEaseMm). */
      path: string;
      /** @description Valeur dans la version from. Absent : paramètre absent (défaut du moteur). */
      from?: number | string | boolean;
      /** @description Valeur dans la version to. Absent : paramètre absent (défaut du moteur). */
      to?: number | string | boolean;
    };
    MeasurementChange: {
      /** @description Nom de champ de MeasurementSet (ex. waistGirthMm). */
      name: string;
      /** @description Valeur dans la version from (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin). */
      from?: number | string;
      /** @description Valeur dans la version to (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin). */
      to?: number | string;
    };
    /**
     * DesignVersionChanges
     * @description Ce qui change des entrées d'une version de modèle (to) par rapport à une autre (from) : paramètres du vêtement et mesures du client, valeurs telles qu'envoyées, sans appliquer les défauts. Seules les entrées différentes sont listées. Contient des mesures : réservé à l'organisation propriétaire, jamais gardé en cache ni journalisé. Longueurs en millimètres.
     */
    'design-version-changes.schema': {
      /** Format: uuid */
      designId: string;
      from: components['schemas']['design-version-summary.schema'];
      to: components['schemas']['design-version-summary.schema'];
      /** @description Vrai si les deux versions ont la même empreinte : mêmes mesures, mêmes paramètres, même version du moteur, donc même patron. */
      sameFingerprint: boolean;
      /** @description Paramètres différents, triés par chemin. */
      params: components['schemas']['ParamChange'][];
      /** @description Mesures différentes, triées par nom. */
      measurements: components['schemas']['MeasurementChange'][];
      $defs: {
        ParamChange: {
          /** @description Chemin du paramètre dans GarmentRequest.params, points entre les niveaux (ex. lengthMm, sleeve.capEaseMm). */
          path: string;
          /** @description Valeur dans la version from. Absent : paramètre absent (défaut du moteur). */
          from?: number | string | boolean;
          /** @description Valeur dans la version to. Absent : paramètre absent (défaut du moteur). */
          to?: number | string | boolean;
        };
        MeasurementChange: {
          /** @description Nom de champ de MeasurementSet (ex. waistGirthMm). */
          name: string;
          /** @description Valeur dans la version from (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin). */
          from?: number | string;
          /** @description Valeur dans la version to (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin). */
          to?: number | string;
        };
      };
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
    /**
     * Fabric
     * @description Tissu d'un drapé : un préréglage et des surcharges facultatives, chacune dans son unité (suffixe). Les valeurs des préréglages sont dans le moteur de drapé et sont des estimations, signalées par DrapeResult.fabricEstimated (ADR 0013).
     */
    'fabric.schema': {
      /** @enum {string} */
      preset:
        'cotton-poplin' | 'cotton-wax' | 'bazin' | 'linen' | 'denim' | 'silk-satin' | 'jersey';
      /** @description Grammage, en grammes par mètre carré. */
      weightGPerM2?: number;
      /** @description Épaisseur, en millimètres. */
      thicknessMm?: number;
      /** @description Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage. */
      stretchWarpPercent?: number;
      /** @description Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage. */
      stretchWeftPercent?: number;
      /** @description Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m). */
      bendingRigidityMicroNm?: number;
      /** @description Coefficient de frottement du tissu sur le corps (sans unité). */
      frictionCoefficient?: number;
    };
    /**
     * AvatarOptions
     * @description Options d'ajustement de l'avatar (FitOptions du moteur mannequin), en plus des mesures. Champ absent : défaut du studio. Le même jeu d'options donne le même corps dans le studio et dans le drapé (ADR 0013).
     */
    'avatar-options.schema': {
      /**
       * @description Âge en années. Défaut : 30.
       * @default 30
       */
      age: number;
      /** @description Proportions de morphotype, de 0 à 1 chacune (normalisées par le moteur mannequin ; somme nulle : africain). Défaut : africain (1, 0, 0). */
      morphotype?: {
        african: number;
        asian: number;
        caucasian: number;
      };
      /**
       * @description Bras abaissés depuis l'horizontale, en degrés. Défaut : 9.
       * @default 9
       */
      armAngleDeg: number;
    };
    /**
     * DrapeRequest
     * @description Demande de drapé d'une version de modèle : le tissu, les options de l'avatar et la finesse. Les mesures et le patron sont ceux de la version. Même demande canonique sur la même version : même drapé (ADR 0013).
     */
    'drape-request.schema': {
      fabric: components['schemas']['fabric.schema'];
      /** @description Absent : défauts du studio, comme {}. */
      avatar?: components['schemas']['avatar-options.schema'];
      /**
       * @description draft (arête de 25 mm) ou standard (arête de 15 mm).
       * @default standard
       * @enum {string}
       */
      quality: 'draft' | 'standard';
    };
    /** @description Aisance : distance du tissu au corps moins l'épaisseur du tissu, en millimètres (négative : pénétration). */
    DrapeEase: {
      minMm: number;
      medianMm: number;
      maxMm: number;
      /** @description Surface du vêtement où l'aisance est nulle (tissu au contact du corps), en mm². */
      tightAreaMm2: number;
    };
    /**
     * Drape
     * @description Drapé d'une version de modèle, tel que le service designs le suit. Le modèle 3D se lit par GET …/drapes/{drapeId}/model une fois le drapé completed. Longueurs en millimètres.
     */
    'drape.schema': {
      /** Format: uuid */
      id: string;
      /**
       * @description pending : en calcul ; completed : modèle disponible ; failed : voir problemType. Un drapé encore pending 10 minutes après createdAt est lu failed (drape-timeout).
       * @enum {string}
       */
      status: 'pending' | 'completed' | 'failed';
      /**
       * @description Seulement si status vaut failed. Types de drape.failed, plus /problems/drape-timeout.
       * @enum {string}
       */
      problemType?:
        | '/problems/drape-placement-missing'
        | '/problems/drape-placement-failed'
        | '/problems/drape-seam-not-closed'
        | '/problems/drape-body-penetration'
        | '/problems/drape-too-large'
        | '/problems/drape-internal'
        | '/problems/drape-timeout';
      /** @description Seulement si status vaut completed. */
      ease?: components['schemas']['DrapeEase'];
      /** @description Seulement si status vaut completed. Allongement relatif maximal, en pourcentage. */
      maxStrainPercent?: number;
      /** @description Seulement si status vaut completed. Vrai si le tissu vient d'un préréglage estimé. */
      fabricEstimated?: boolean;
      /** Format: date-time */
      createdAt: string;
      /**
       * Format: date-time
       * @description Fin du calcul (completed ou failed), en UTC.
       */
      completedAt?: string;
    };
  };
  responses: {
    /** @description Erreur au format RFC 9457. 502 /problems/engine-unavailable : moteur injoignable, trop lent (délai dépassé), réponse hors contrat ou requête refusée par sa validation. Types stables des drapés : voir getVersionDrape (dont /problems/drape-timeout) et getVersionDrapeModel. */
    Problem: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/problem+json': components['schemas']['Problem'];
      };
    };
    /** @description Version impossible à créer, au format RFC 9457. /problems/garment-type-mismatch : le type de vêtement demandé n'est pas celui du modèle. Sinon, le service relaie le type stable du moteur de patronage (contracts/openapi/patterning.yaml), seulement s'il est dans cette liste : /problems/measurement-required, /problems/inconsistent-measurements, /problems/garment-type-not-supported, /problems/skirt-shorter-than-hip-depth, /problems/trousers-shorter-than-crotch, /problems/trousers-hem-too-narrow, /problems/neckline-too-deep, /problems/sleeve-shorter-than-cap ; le détail est relayé (il ne contient jamais de mesure). Un autre type /problems/… du moteur devient /problems/pattern-impossible, avec un détail fixé par le service. Une erreur de validation du moteur (422 sans type /problems/…), un délai dépassé ou une réponse hors contrat deviennent 502 /problems/engine-unavailable ; leur corps n'est ni relayé ni journalisé. */
    DraftingProblem: {
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
    DrapeId: string;
    /** @description Nombre de résumés par page. */
    Limit: number;
    /** @description Curseur opaque rendu par la page précédente (nextCursor). Absent : première page. */
    Cursor: string;
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
  listDesignVersions: {
    parameters: {
      query?: {
        /** @description Nombre de résumés par page. */
        limit?: components['parameters']['Limit'];
        /** @description Curseur opaque rendu par la page précédente (nextCursor). Absent : première page. */
        cursor?: components['parameters']['Cursor'];
      };
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Une page de résumés de versions (vide si le modèle n'a pas encore de version). */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design-version-page.schema'];
        };
      };
      400: components['responses']['Problem'];
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
      422: components['responses']['DraftingProblem'];
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
          'Cache-Control': components['headers']['NoStore'];
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design-version.schema'];
        };
      };
      404: components['responses']['Problem'];
    };
  };
  getDesignVersionChanges: {
    parameters: {
      query: {
        /** @description Numéro de la version de référence (avant ou après versionNumber). */
        since: number;
      };
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Les différences, triées par chemin de paramètre puis par nom de mesure. */
      200: {
        headers: {
          'Cache-Control': components['headers']['NoStore'];
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['design-version-changes.schema'];
        };
      };
      400: components['responses']['Problem'];
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
  createVersionDrape: {
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
        'application/json': components['schemas']['drape-request.schema'];
      };
    };
    responses: {
      /** @description Drapé existant pour la même demande (pending ou completed). */
      200: {
        headers: {
          'Cache-Control': components['headers']['NoStore'];
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['drape.schema'];
        };
      };
      /** @description Drapé demandé, pending. */
      202: {
        headers: {
          /** @description Chemin du drapé (GET …/drapes/{drapeId}). */
          Location?: string;
          'Cache-Control': components['headers']['NoStore'];
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['drape.schema'];
        };
      };
      400: components['responses']['Problem'];
      404: components['responses']['Problem'];
    };
  };
  getVersionDrape: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
        drapeId: components['parameters']['DrapeId'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Le drapé. */
      200: {
        headers: {
          'Cache-Control': components['headers']['NoStore'];
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['drape.schema'];
        };
      };
      404: components['responses']['Problem'];
    };
  };
  getVersionDrapeModel: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        designId: components['parameters']['DesignId'];
        versionNumber: components['parameters']['VersionNumber'];
        drapeId: components['parameters']['DrapeId'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Le modèle glTF 2.0 binaire. */
      200: {
        headers: {
          'Cache-Control'?: 'private, no-store';
          'X-Content-Type-Options'?: 'nosniff';
          [name: string]: unknown;
        };
        content: {
          'model/gltf-binary': string;
        };
      };
      404: components['responses']['Problem'];
      /** @description /problems/drape-not-completed (RFC 9457) : le drapé est pending ou failed, aucun modèle à lire. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/problem+json': components['schemas']['Problem'];
        };
      };
      /** @description /problems/storage-unavailable (RFC 9457) : stockage objet injoignable ou objet absent. */
      502: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/problem+json': components['schemas']['Problem'];
        };
      };
    };
  };
}
