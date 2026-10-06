/** Cause d'un refus : permet au studio de choisir un message sans lire le texte de l'erreur. */
export type DraftingErrorCode =
  | 'unknown-model'
  | 'unknown-size'
  | 'invalid-request'
  | 'invalid-option'
  | 'invalid-measurement'
  | 'missing-measurement'
  | 'freesewing'
  | 'invalid-contour'
  | 'edge-not-found'
  | 'coverage';

/**
 * Erreur du moteur de tracé : rien n'est rendu. Le message est destiné aux développeurs et aux journaux ; il ne
 * contient jamais de valeur de mesure (donnée personnelle). Les sous-classes portent les détails typés ; leur
 * `name` est écrit en dur, car un empaqueteur peut renommer les classes.
 */
export class DraftingError extends Error {
  constructor(
    readonly code: DraftingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DraftingError';
  }
}

/** Entrée mal formée : ni taille ni jeu de mesures, ou les deux. */
export class InvalidRequestError extends DraftingError {
  constructor(message: string) {
    super('invalid-request', message);
    this.name = 'InvalidRequestError';
  }
}

/** Clé de modèle absente du registre. */
export class UnknownModelError extends DraftingError {
  constructor(
    readonly model: string,
    readonly known: readonly string[],
  ) {
    super('unknown-model', `unknown model "${model}" (known: ${known.join(', ')})`);
    this.name = 'UnknownModelError';
  }
}

/** Nom de taille absent des tableaux de FreeSewing (`cisMaleAdult42`…). */
export class UnknownSizeError extends DraftingError {
  constructor(readonly size: string) {
    super('unknown-size', `unknown size "${size}"`);
    this.name = 'UnknownSizeError';
  }
}

/** Option inconnue, non réglable, d'un type inattendu ou hors de ses bornes. */
export class InvalidOptionError extends DraftingError {
  constructor(
    readonly model: string,
    readonly option: string,
    readonly reason: string,
  ) {
    super('invalid-option', `model ${model}, option "${option}": ${reason}`);
    this.name = 'InvalidOptionError';
  }
}

/** Mesure présente mais inutilisable (pas un nombre fini, nulle, négative ou démesurée) ; `field` est le champ du jeu. */
export class InvalidMeasurementError extends DraftingError {
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super('invalid-measurement', `measurement ${field} ${reason}`);
    this.name = 'InvalidMeasurementError';
  }
}

/** Une mesure que le modèle exige, et qui manque. */
export interface MissingMeasurement {
  /** Nom FreeSewing de la mesure, ex. `shoulderSlope`. */
  readonly measurement: string;
  /** Champs absents du `MeasurementSet` qui la fournissent, ex. `shoulderSlopeDeg`. */
  readonly fields: readonly string[];
}

/** Le modèle exige des mesures que le jeu ne fournit pas : toutes sont nommées. */
export class MissingMeasurementError extends DraftingError {
  constructor(
    readonly model: string,
    readonly missing: readonly MissingMeasurement[],
  ) {
    const list = missing
      .map((m) => `${m.fields.join(' + ') || 'no MeasurementSet field'} (${m.measurement})`)
      .join(', ');
    super('missing-measurement', `model ${model} needs measurements that are absent: ${list}`);
    this.name = 'MissingMeasurementError';
  }
}

/** FreeSewing a journalisé au moins une erreur pendant le tracé : le tracé est rejeté. */
export class FreeSewingError extends DraftingError {
  constructor(
    readonly model: string,
    readonly messages: readonly string[],
  ) {
    const list = messages.join(' ; ');
    super('freesewing', `FreeSewing logged ${messages.length} error(s) for ${model}: ${list}`);
    this.name = 'FreeSewingError';
  }
}

/** Contour absent, non fermé ou à coordonnée non finie, point à coordonnée non finie, ou pièce non tracée. */
export class ContourError extends DraftingError {
  constructor(
    readonly part: string,
    readonly reason: string,
  ) {
    super('invalid-contour', `part ${part}: ${reason}`);
    this.name = 'ContourError';
  }
}

/** Un bord de la fiche de couture ne se retrouve pas sur le contour tracé. */
export class EdgeNotFoundError extends DraftingError {
  constructor(
    readonly part: string,
    readonly edge: string,
    readonly reason: string,
  ) {
    super('edge-not-found', `part ${part}, edge "${edge}": ${reason}`);
    this.name = 'EdgeNotFoundError';
  }
}

/** Les bords de la fiche ne couvrent pas le contour exactement une fois. */
export class CoverageError extends DraftingError {
  constructor(
    readonly part: string,
    /** Indices des segments du contour qu'aucun bord ne couvre. */
    readonly uncovered: readonly number[],
    /** Indices des segments couverts par plus d'un bord. */
    readonly overlapping: readonly number[],
  ) {
    const gaps = `segments without an edge [${uncovered.join(', ')}]`;
    super(
      'coverage',
      `part ${part}: ${gaps}, segments in several edges [${overlapping.join(', ')}]`,
    );
    this.name = 'CoverageError';
  }
}
