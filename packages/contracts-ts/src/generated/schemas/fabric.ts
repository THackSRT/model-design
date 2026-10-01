// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

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
