// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Demande de drapé d'une version de modèle : le tissu, les options de l'avatar et la finesse. Les mesures et le patron sont ceux de la version. Même demande canonique sur la même version : même drapé (ADR 0013).
 */
export interface DrapeRequest {
  fabric: Fabric;
  avatar?: AvatarOptions;
  /**
   * draft (arête de 25 mm) ou standard (arête de 15 mm).
   */
  quality?: 'draft' | 'standard';
}
/**
 * Tissu d'un drapé : un préréglage et des surcharges facultatives, chacune dans son unité (suffixe). Les valeurs des préréglages sont dans le moteur de drapé et sont des estimations, signalées par DrapeResult.fabricEstimated (ADR 0013).
 */
export interface Fabric {
  preset: 'cotton-poplin' | 'cotton-wax' | 'bazin' | 'linen' | 'denim' | 'silk-satin' | 'jersey';
  /**
   * Grammage, en grammes par mètre carré.
   */
  weightGPerM2?: number;
  /**
   * Épaisseur, en millimètres.
   */
  thicknessMm?: number;
  /**
   * Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage.
   */
  stretchWarpPercent?: number;
  /**
   * Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage.
   */
  stretchWeftPercent?: number;
  /**
   * Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m).
   */
  bendingRigidityMicroNm?: number;
  /**
   * Coefficient de frottement du tissu sur le corps (sans unité).
   */
  frictionCoefficient?: number;
}
/**
 * Absent : défauts du studio, comme {}.
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
