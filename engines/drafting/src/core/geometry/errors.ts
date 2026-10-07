/** Cause d'un refus : permet à l'appelant de choisir un message sans lire le texte de l'erreur. */
export type GeometryErrorCode =
  /** Argument inutilisable : liste de points vide, pas ou nombre de segments invalide, valeurs de couture en nombre faux. */
  | 'invalid-argument'
  /** La découpe d'un polygone ne croise pas son contour au moins deux fois. */
  | 'no-crossing';

/**
 * Erreur de la géométrie plane. Le message est destiné aux développeurs et aux journaux ; il ne contient jamais de
 * coordonnée ni de longueur (donnée personnelle quand elle vient d'une mesure). Le `name` est écrit en dur, car un
 * empaqueteur peut renommer les classes.
 */
export class GeometryError extends Error {
  constructor(
    readonly code: GeometryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GeometryError';
  }
}
