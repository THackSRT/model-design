// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Drapé d'une version de modèle, tel que le service designs le suit. Le modèle 3D se lit par GET …/drapes/{drapeId}/model une fois le drapé completed. Longueurs en millimètres.
 */
export interface Drape {
  id: string;
  /**
   * pending : en calcul ; completed : modèle disponible ; failed : voir problemType. Un drapé encore pending 10 minutes après createdAt est lu failed (drape-timeout).
   */
  status: 'pending' | 'completed' | 'failed';
  /**
   * Seulement si status vaut failed. Types de drape.failed, plus /problems/drape-timeout.
   */
  problemType?:
    | '/problems/drape-placement-missing'
    | '/problems/drape-placement-failed'
    | '/problems/drape-seam-not-closed'
    | '/problems/drape-body-penetration'
    | '/problems/drape-too-large'
    | '/problems/drape-internal'
    | '/problems/drape-timeout';
  ease?: DrapeEase;
  /**
   * Seulement si status vaut completed. Allongement relatif maximal, en pourcentage.
   */
  maxStrainPercent?: number;
  /**
   * Seulement si status vaut completed. Vrai si le tissu vient d'un préréglage estimé.
   */
  fabricEstimated?: boolean;
  createdAt: string;
  /**
   * Fin du calcul (completed ou failed), en UTC.
   */
  completedAt?: string;
}
/**
 * Seulement si status vaut completed.
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
