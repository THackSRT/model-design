// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Grandeurs physiques déduites des mesures brutes (FabricBenchMeasurements) par les fonctions du banc d'essai du moteur de drapé (ADR 0015). Une grandeur n'est présente que si l'essai correspondant a été saisi. Informatives dans un rapport : recalculées depuis les mesures brutes à chaque import. Elles peuvent sortir des bornes de Fabric (le tissu ne se modélise alors pas tel quel).
 */
export interface FabricDerivedValues {
  /**
   * Grammage, en grammes par mètre carré.
   */
  weightGPerM2?: number;
  /**
   * Épaisseur moyenne, en millimètres.
   */
  thicknessMm?: number;
  /**
   * Allongement chaîne ramené à 10 N sur 50 mm de large, en pourcentage.
   */
  stretchWarpPercent?: number;
  /**
   * Allongement trame ramené à 10 N sur 50 mm de large, en pourcentage.
   */
  stretchWeftPercent?: number;
  /**
   * Longueur de flexion dans le sens chaîne (porte-à-faux moyen / 2), en millimètres.
   */
  bendingLengthWarpMm?: number;
  /**
   * Longueur de flexion dans le sens trame, en millimètres.
   */
  bendingLengthWeftMm?: number;
  /**
   * Rigidité de flexion par unité de largeur, sens chaîne, en µN·m.
   */
  bendingRigidityWarpMicroNm?: number;
  /**
   * Rigidité de flexion par unité de largeur, sens trame, en µN·m.
   */
  bendingRigidityWeftMicroNm?: number;
  /**
   * Rigidité de flexion retenue, en µN·m : moyenne géométrique chaîne et trame, ou le seul sens mesuré (le moteur de drapé a une flexion isotrope).
   */
  bendingRigidityMicroNm?: number;
  /**
   * Grammage utilisé pour la rigidité de flexion : measured (pesée saisie) ou estimated (grammage du préréglage, faute de pesée).
   */
  bendingWeightSource?: 'measured' | 'estimated';
  /**
   * Coefficient de frottement statique (moyenne des tan θ), sans unité.
   */
  frictionCoefficient?: number;
}
