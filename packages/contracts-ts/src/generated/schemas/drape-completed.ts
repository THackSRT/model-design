// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Données de l'événement drape.completed : le drapé drapeId est calculé. Aucune mesure, aucun texte libre.
 */
export interface DrapeCompleted {
  drapeId: string;
  designId: string;
  versionNumber: number;
  organizationId: string;
  result: DrapeResult;
}
/**
 * Résultat d'un drapé réussi : le modèle glTF binaire (vêtement seul) écrit dans le stockage objet, et ses indicateurs. Longueurs en millimètres, surfaces en millimètres carrés.
 */
export interface DrapeResult {
  /**
   * Clé de l'objet dans le seau privé des drapés : drapes/<organizationId>/<cacheKey>.glb. Jamais d'URL publique.
   */
  modelKey: string;
  sizeBytes: number;
  sha256: string;
  ease: DrapeEase;
  /**
   * Allongement relatif maximal du tissu, en pourcentage (négatif : compression partout).
   */
  maxStrainPercent: number;
  /**
   * Vrai si une propriété du tissu vient d'un préréglage estimé.
   */
  fabricEstimated: boolean;
  engineVersion: string;
  vertexCount: number;
  simulatedSteps: number;
  /**
   * Vrai si la vitesse maximale est restée sous 1 mm/s pendant 10 pas avant la fin.
   */
  converged: boolean;
}
/**
 * Aisance : distance du tissu au corps moins l'épaisseur du tissu, en millimètres (négative : pénétration).
 */
export interface DrapeEase {
  minMm: number;
  medianMm: number;
  maxMm: number;
  /**
   * Surface du vêtement où l'aisance est nulle (tissu au contact du corps), en mm².
   */
  tightAreaMm2: number;
}
