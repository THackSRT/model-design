// Surface minimale de FreeSewing 4.10.2 que le moteur utilise. Les paquets @freesewing/* sont des sources ES sans
// types (ADR 0019, défaut P4) : freesewing.d.ts les déclare avec ces interfaces, rien de plus.

/** Point de FreeSewing : millimètres, y vers le bas (les attributs ne sont pas lus). */
export interface FsPoint {
  readonly x: number;
  readonly y: number;
}

/** Opération d'un chemin : `move`, `line`, `curve`, `close` ou `noop`. */
export interface FsOp {
  readonly type: string;
  readonly to?: FsPoint;
  readonly cp1?: FsPoint;
  readonly cp2?: FsPoint;
}

export interface FsPath {
  readonly ops: readonly FsOp[];
}

export interface FsPart {
  /** Vrai pour une pièce masquée (squelette de modèle, pièce désactivée par une option). */
  readonly hidden?: boolean;
  readonly points: Readonly<Record<string, FsPoint>>;
  readonly paths: Readonly<Record<string, FsPath | undefined>>;
}

/** Magasin d'un tracé : journaux, et drapeaux du greffon d'annotations (`flag.error`, `flag.warn`…). */
export interface FsStore {
  readonly logs: { readonly error: readonly unknown[]; readonly warn: readonly unknown[] };
  readonly plugins?: {
    readonly 'plugin-annotations'?: {
      readonly flags?: Readonly<Record<string, Readonly<Record<string, unknown>> | undefined>>;
    };
  };
  /** Valeur rangée par un modèle ou un greffon, ex. `library.sleeve.frontArmholeLength`. */
  get(path: string | readonly string[], fallback?: unknown): unknown;
}

/** Réglages d'un tracé : toujours métrique, sans valeur de couture, sans annotations (ADR 0019). */
export interface FsSettings {
  readonly measurements: Readonly<Record<string, number>>;
  readonly options: Readonly<Record<string, unknown>>;
  readonly sa: number;
  readonly complete: boolean;
  readonly paperless: boolean;
  readonly units: 'metric';
}

export interface FsPattern {
  /** Pièces tracées, une table par jeu de réglages (le moteur n'en utilise qu'un). */
  readonly parts: readonly Readonly<Record<string, FsPart | undefined>>[];
  readonly store: FsStore;
  readonly setStores: readonly FsStore[];
  draft(): FsPattern;
}

/** Configuration d'un modèle : mesures qu'il exige ou utilise, pièces qu'il trace, et ses options. */
export interface FsPatternConfig {
  readonly measurements: readonly string[];
  readonly optionalMeasurements: readonly string[];
  /** Pièces par nom (`brian.front`) ; seules les clés servent (contrôle d'une fiche). */
  readonly parts: Readonly<Record<string, unknown>>;
  readonly options: Readonly<Record<string, unknown>>;
}

/** Classe d'un modèle (`Brian`) : `new Brian(réglages).draft()`. */
export interface FsDesign {
  new (settings: FsSettings): FsPattern;
  readonly patternConfig: FsPatternConfig;
}
