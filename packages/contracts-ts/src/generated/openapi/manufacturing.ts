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
  '/v1/cut-patterns': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Calculer les pièces de coupe d'un patron
     * @description Ajoute les valeurs de couture bord par bord, place les crans, le droit fil et la pliure.
     */
    post: operations['createCutPattern'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/graded-patterns': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Grader un patron à partir d'une spécification par taille */
    post: operations['createGradedPattern'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/cutting-plans': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Calculer un plan de coupe
     * @description Imbrication simple et déterministe (ADR 0009), synchrone tant qu'elle reste sous la seconde pour les bornes du contrat. Une version en tâche (NATS) viendra avec une imbrication plus fine.
     */
    post: operations['createCuttingPlan'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/exports': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Exporter les pièces de coupe (SVG 1:1, PDF A4 tuilé, DXF-AAMA) */
    post: operations['createExport'];
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
      /** @description Identifiant stable, ex. /problems/unknown-edge */
      type: string;
      title: string;
      status: number;
      detail?: string;
    };
    CutPatternRequest: components['schemas']['cut-pattern-request.schema'];
    CutPattern: components['schemas']['cut-pattern.schema'];
    GradedPatternRequest: components['schemas']['graded-pattern-request.schema'];
    GradedPattern: components['schemas']['graded-pattern.schema'];
    CuttingPlanRequest: components['schemas']['cutting-plan-request.schema'];
    CuttingPlan: components['schemas']['cutting-plan.schema'];
    ExportRequest: components['schemas']['export-request.schema'];
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
     * CutPatternRequest
     * @description Demande de pièces de coupe : une spécification de patron et la façon de la finir.
     */
    'cut-pattern-request.schema': {
      spec: components['schemas']['garment-spec.schema'];
      finishing?: components['schemas']['finishing-options.schema'];
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
    SizedSpec: {
      size: components['schemas']['size-label.schema'];
      spec: components['schemas']['garment-spec.schema'];
    };
    /**
     * GradedPatternRequest
     * @description Gradation par recalcul : une spécification par taille, toutes calculées par le moteur de patronage avec les mêmes pièces et les mêmes bords (mêmes identifiants, même ordre). Le moteur les finit, les aligne et en déduit les écarts de gradation par rapport à la taille de base.
     */
    'graded-pattern-request.schema': {
      /** @description Taille de base : l'une des tailles de sizes. */
      baseSize: components['schemas']['size-label.schema'];
      sizes: components['schemas']['SizedSpec'][];
      finishing?: components['schemas']['finishing-options.schema'];
      /**
       * @description origin : pièces laissées dans leur repère (le moteur de patronage place le point de référence de gradation à l'origine). grainline : chaque pièce est translatée pour que le début de son droit fil coïncide avec celui de la taille de base.
       * @default origin
       * @enum {string}
       */
      alignment: 'origin' | 'grainline';
      $defs: {
        SizedSpec: {
          size: components['schemas']['size-label.schema'];
          spec: components['schemas']['garment-spec.schema'];
        };
      };
    };
    SizeDelta: {
      size: components['schemas']['size-label.schema'];
      dxMm: number;
      dyMm: number;
    };
    VertexGradeRule: {
      edgeId: string;
      /** @description Écart de ce sommet pour chaque taille par rapport à la taille de base (0 pour la base), dans l'ordre des tailles. */
      deltas: components['schemas']['SizeDelta'][];
    };
    SizedCutPattern: {
      size: components['schemas']['size-label.schema'];
      pieces: components['schemas']['CutPiece'][];
    };
    PanelGradeRule: {
      panelId: string;
      /** @description Un sommet par bord : le début (from) du bord edgeId, sur la ligne de couture. */
      vertices: components['schemas']['VertexGradeRule'][];
    };
    /**
     * GradedPattern
     * @description Patron gradué : les pièces de coupe de chaque taille, alignées, et les écarts de gradation de chaque sommet de la ligne de couture par rapport à la taille de base. Millimètres.
     */
    'graded-pattern.schema': {
      /** @constant */
      unit: 'mm';
      engine: components['schemas']['EngineRef'];
      baseSize: components['schemas']['size-label.schema'];
      /** @description Dans l'ordre de la demande. */
      sizes: components['schemas']['SizedCutPattern'][];
      /** @description Une entrée par pièce, dans l'ordre des pièces. */
      gradeRules: components['schemas']['PanelGradeRule'][];
      $defs: {
        SizedCutPattern: {
          size: components['schemas']['size-label.schema'];
          pieces: components['schemas']['CutPiece'][];
        };
        PanelGradeRule: {
          panelId: string;
          /** @description Un sommet par bord : le début (from) du bord edgeId, sur la ligne de couture. */
          vertices: components['schemas']['VertexGradeRule'][];
        };
        VertexGradeRule: {
          edgeId: string;
          /** @description Écart de ce sommet pour chaque taille par rapport à la taille de base (0 pour la base), dans l'ordre des tailles. */
          deltas: components['schemas']['SizeDelta'][];
        };
        SizeDelta: {
          size: components['schemas']['size-label.schema'];
          dxMm: number;
          dyMm: number;
        };
      };
    };
    /**
     * @description Sens du tissu. one-way : tissu à sens (velours, motif orienté), toutes les pièces dans le même sens. two-way : une pièce peut être tournée de 180°.
     * @default two-way
     * @enum {string}
     */
    FabricDirection: 'one-way' | 'two-way';
    GarmentToCut: {
      /** @description Taille ou repère du vêtement, reporté sur chaque placement. */
      label: components['schemas']['size-label.schema'];
      spec: components['schemas']['garment-spec.schema'];
      /**
       * @description Nombre d'exemplaires du vêtement.
       * @default 1
       */
      count: number;
    };
    FabricLayout: {
      /** @description Laize, lisières comprises. */
      fabricWidthMm: number;
      /**
       * @description single : tissu à plat, une épaisseur (les pièces sur pliure sont dépliées). folded : tissu plié en deux dans le droit fil, deux épaisseurs (une pièce placée donne une paire symétrique ; une pièce sur pliure pose son bord de pliure sur la pliure du tissu).
       * @default folded
       * @enum {string}
       */
      layout: 'single' | 'folded';
      direction?: components['schemas']['FabricDirection'];
      /**
       * @description Marge laissée le long de chaque lisière.
       * @default 10
       */
      selvedgeMarginMm: number;
    };
    /**
     * CuttingPlanRequest
     * @description Demande de plan de coupe : les vêtements à couper (une spécification et un nombre d'exemplaires chacun), la finition et le tissu. Millimètres.
     */
    'cutting-plan-request.schema': {
      garments: components['schemas']['GarmentToCut'][];
      finishing?: components['schemas']['finishing-options.schema'];
      fabric: components['schemas']['FabricLayout'];
      /**
       * @description Écart minimal entre deux pièces.
       * @default 5
       */
      spacingMm: number;
      $defs: {
        GarmentToCut: {
          /** @description Taille ou repère du vêtement, reporté sur chaque placement. */
          label: components['schemas']['size-label.schema'];
          spec: components['schemas']['garment-spec.schema'];
          /**
           * @description Nombre d'exemplaires du vêtement.
           * @default 1
           */
          count: number;
        };
        FabricLayout: {
          /** @description Laize, lisières comprises. */
          fabricWidthMm: number;
          /**
           * @description single : tissu à plat, une épaisseur (les pièces sur pliure sont dépliées). folded : tissu plié en deux dans le droit fil, deux épaisseurs (une pièce placée donne une paire symétrique ; une pièce sur pliure pose son bord de pliure sur la pliure du tissu).
           * @default folded
           * @enum {string}
           */
          layout: 'single' | 'folded';
          direction?: components['schemas']['FabricDirection'];
          /**
           * @description Marge laissée le long de chaque lisière.
           * @default 10
           */
          selvedgeMarginMm: number;
        };
        /**
         * @description Sens du tissu. one-way : tissu à sens (velours, motif orienté), toutes les pièces dans le même sens. two-way : une pièce peut être tournée de 180°.
         * @default two-way
         * @enum {string}
         */
        FabricDirection: 'one-way' | 'two-way';
      };
    };
    Placement: {
      garmentLabel: components['schemas']['size-label.schema'];
      panelId: string;
      /** @description Numéro de placement de cette pièce pour ce vêtement (à partir de 1). */
      copy: number;
      /** @description Pièces obtenues par ce placement : 2 sur tissu plié, 1 sinon ou pour une pièce sur pliure. */
      plies: number;
      /** @description Rotation appliquée à la pièce (repère de GarmentSpec) pour aligner son droit fil sur x, plus 180° si la pièce est retournée. */
      rotationDeg: number;
      /** @description Vrai : la pièce est placée en symétrique (paire gauche / droite sur tissu à plat). */
      mirrored: boolean;
      /** @description Vrai : le bord de pliure de la pièce est posé sur la pliure du tissu (y = 0). */
      onFold: boolean;
      /** @description Ligne de coupe placée, dans le repère du plan (dépliée si la pièce sur pliure est coupée à plat). */
      outline: components['schemas']['Point'][];
    };
    /**
     * CuttingPlan
     * @description Plan de coupe : placement des pièces sur la laize, métrage et efficience. Repère du plan en millimètres : x le long du tissu (droit fil), de 0 à fabricLengthMm ; y en travers, de 0 à usableWidthMm, y = 0 sur la pliure (folded) ou à la marge de la lisière (single).
     */
    'cutting-plan.schema': {
      /** @constant */
      unit: 'mm';
      engine: components['schemas']['EngineRef'];
      fabricWidthMm: number;
      /** @description Largeur où l'on place les pièces : laize moins les marges de lisière, divisée par deux si le tissu est plié. */
      usableWidthMm: number;
      /** @enum {string} */
      layout: 'single' | 'folded';
      /** @enum {string} */
      direction: 'one-way' | 'two-way';
      /** @description Métrage : longueur de tissu à couper, arrondie au millimètre supérieur. */
      fabricLengthMm: number;
      /** @description Aire des pièces placées divisée par l'aire utilisée (usableWidthMm × fabricLengthMm), de 0 à 1, arrondie à 4 décimales. */
      efficiency: number;
      /** @description Nombre de pièces obtenues à la coupe. */
      pieceCount: number;
      /** @description Pièces coupées en trop (quantité impaire sur tissu plié). */
      surplusPieceCount: number;
      placements: components['schemas']['Placement'][];
      $defs: {
        Placement: {
          garmentLabel: components['schemas']['size-label.schema'];
          panelId: string;
          /** @description Numéro de placement de cette pièce pour ce vêtement (à partir de 1). */
          copy: number;
          /** @description Pièces obtenues par ce placement : 2 sur tissu plié, 1 sinon ou pour une pièce sur pliure. */
          plies: number;
          /** @description Rotation appliquée à la pièce (repère de GarmentSpec) pour aligner son droit fil sur x, plus 180° si la pièce est retournée. */
          rotationDeg: number;
          /** @description Vrai : la pièce est placée en symétrique (paire gauche / droite sur tissu à plat). */
          mirrored: boolean;
          /** @description Vrai : le bord de pliure de la pièce est posé sur la pliure du tissu (y = 0). */
          onFold: boolean;
          /** @description Ligne de coupe placée, dans le repère du plan (dépliée si la pièce sur pliure est coupée à plat). */
          outline: components['schemas']['Point'][];
        };
      };
    };
    /**
     * @description svg : une planche à l'échelle 1:1 (unités mm). pdf-a4-tiled : la même planche découpée en pages A4 à assembler, précédées d'un plan d'assemblage avec un carré de contrôle de 100 mm. dxf-aama : DXF R12 selon AAMA-DXF (ASTM D6673), une taille, pour les logiciels de CAO et les tables de coupe.
     * @enum {string}
     */
    ExportFormat: 'svg' | 'pdf-a4-tiled' | 'dxf-aama';
    /**
     * ExportRequest
     * @description Demande d'export des pièces de coupe d'un patron, à l'échelle 1:1. La réponse est le fichier lui-même (SVG, PDF ou DXF).
     */
    'export-request.schema': {
      format: components['schemas']['ExportFormat'];
      spec: components['schemas']['garment-spec.schema'];
      finishing?: components['schemas']['finishing-options.schema'];
      sizeLabel?: components['schemas']['size-label.schema'];
      /** @description Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client. */
      reference?: components['schemas']['size-label.schema'];
      /**
       * @description Langue des annotations (droit fil, pliure, « couper 2 × »).
       * @default fr
       * @enum {string}
       */
      locale: 'fr';
      $defs: {
        /**
         * @description svg : une planche à l'échelle 1:1 (unités mm). pdf-a4-tiled : la même planche découpée en pages A4 à assembler, précédées d'un plan d'assemblage avec un carré de contrôle de 100 mm. dxf-aama : DXF R12 selon AAMA-DXF (ASTM D6673), une taille, pour les logiciels de CAO et les tables de coupe.
         * @enum {string}
         */
        ExportFormat: 'svg' | 'pdf-a4-tiled' | 'dxf-aama';
      };
    };
  };
  responses: {
    /** @description Entrées conformes au schéma mais impossibles à traiter, au format RFC 9457. Types stables : /problems/unknown-edge (bord ou pièce cité inconnu), /problems/allowance-on-fold (valeur de couture demandée sur une pliure), /problems/allowance-on-dart (valeur de couture demandée sur une jambe de pince), /problems/adjacent-darts (deux pinces qui se touchent ou partagent un bord), /problems/notch-outside-edge (cran au-delà du bord), /problems/open-contour (contour de pièce non fermé), /problems/fold-edge-missing (pièce sur pliure sans bord de rôle fold), /problems/cut-line-self-intersects (valeurs de couture trop grandes pour une courbe), /problems/sizes-mismatch (tailles sans les mêmes pièces ni les mêmes bords, ou taille de base absente), /problems/fold-not-on-grain (pliure non parallèle au droit fil sur tissu plié), /problems/piece-wider-than-fabric (pièce plus large que la laize utile), /problems/too-many-pieces (plus de 500 placements), /problems/export-format-unavailable (format pas encore livré par cette version du moteur). Une requête hors schéma reçoit la réponse 422 de validation de FastAPI. */
    Problem: {
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
  createCutPattern: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['cut-pattern-request.schema'];
      };
    };
    responses: {
      /** @description Les pièces de coupe. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['cut-pattern.schema'];
        };
      };
      422: components['responses']['Problem'];
    };
  };
  createGradedPattern: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['graded-pattern-request.schema'];
      };
    };
    responses: {
      /** @description Les pièces de coupe de chaque taille et les écarts de gradation. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['graded-pattern.schema'];
        };
      };
      422: components['responses']['Problem'];
    };
  };
  createCuttingPlan: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['cutting-plan-request.schema'];
      };
    };
    responses: {
      /** @description Le plan de coupe, le métrage et l'efficience. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['cutting-plan.schema'];
        };
      };
      422: components['responses']['Problem'];
    };
  };
  createExport: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['export-request.schema'];
      };
    };
    responses: {
      /** @description Le fichier, dans le type de contenu du format demandé : image/svg+xml (svg), application/pdf (pdf-a4-tiled), image/vnd.dxf (dxf-aama). */
      200: {
        headers: {
          /** @description attachment; filename="<garment.type>[-<sizeLabel>].<svg|pdf|dxf>", construit par le moteur à partir de valeurs contrôlées, jamais d'un texte libre. */
          'Content-Disposition'?: string;
          [name: string]: unknown;
        };
        content: {
          'image/svg+xml': string;
          'application/pdf': string;
          'image/vnd.dxf': string;
        };
      };
      422: components['responses']['Problem'];
    };
  };
}
