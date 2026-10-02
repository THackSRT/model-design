/** Pesanteur, mm/s². */
export const GRAVITY_MM_PER_S2 = 9810;
/** Fraction de la pesanteur pendant la phase de couture. */
export const SEWING_GRAVITY_SCALE = 0.1;
/** Distance de sécurité ajoutée à l'épaisseur du tissu pour la collision, mm. */
export const CONTACT_MARGIN_MM = 2;
/** Zone de capture des collisions autour du corps, mm (au-delà de la distance de contact). */
export const CAPTURE_RANGE_MM = 8;
/** Taux d'amortissement des modes non rigides, 1/s. */
export const DAMPING_PER_S = 8;
/** Pas consécutifs sous la vitesse de repos pour arrêter. */
export const REST_STEPS = 10;
/** Souplesse finale d'une couture, en fraction de celle d'une arête (couture plus raide que le tissu : elle se ferme). */
export const SEWING_FINAL_RATIO = 0.02;
/** Souplesse de couture au début de la phase de couture, en multiples de celle d'une arête. */
export const SEWING_SOFTNESS_START = 300;
/** Amortissement visqueux d'un tissu retenu (sommets fixes ou en contact), 1/s. */
export const ANCHORED_DAMPING_PER_S = 4;
/** Maximum d'itérations de contraintes par sous-pas (`SimulationSettings.iterations`). */
export const MAX_ITERATIONS = 32;
