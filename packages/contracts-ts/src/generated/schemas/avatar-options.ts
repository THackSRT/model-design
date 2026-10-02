// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Options d'ajustement de l'avatar (FitOptions du moteur mannequin), en plus des mesures. Champ absent : défaut du studio. Le même jeu d'options donne le même corps dans le studio et dans le drapé (ADR 0013).
 */
export interface AvatarOptions {
  /**
   * Âge en années. Défaut : 30.
   */
  age?: number;
  /**
   * Proportions de morphotype, de 0 à 1 chacune (normalisées par le moteur mannequin ; somme nulle : africain). Défaut : africain (1, 0, 0).
   */
  morphotype?: {
    african: number;
    asian: number;
    caucasian: number;
  };
  /**
   * Bras abaissés depuis l'horizontale, en degrés. Défaut : 9.
   */
  armAngleDeg?: number;
}
