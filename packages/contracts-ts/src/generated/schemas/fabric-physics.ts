// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Les six propriétés physiques d'un tissu (même nom et même forme que FabricPhysics du moteur de drapé), toutes présentes, chacune dans son unité (suffixe) et dans les bornes de Fabric : valeurs d'un préréglage du moteur de drapé, ou valeurs corrigées par un modéliste au banc d'essai des tissus (ADR 0015).
 */
export interface FabricPhysics {
  /**
   * Grammage, en grammes par mètre carré.
   */
  weightGPerM2: number;
  /**
   * Épaisseur, en millimètres.
   */
  thicknessMm: number;
  /**
   * Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage.
   */
  stretchWarpPercent: number;
  /**
   * Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage.
   */
  stretchWeftPercent: number;
  /**
   * Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m).
   */
  bendingRigidityMicroNm: number;
  /**
   * Coefficient de frottement du tissu sur le corps (sans unité).
   */
  frictionCoefficient: number;
}
