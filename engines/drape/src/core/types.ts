// Types du cœur de simulation. Longueurs en mm, masses en g, temps en s (donc forces en g·mm/s²).

export interface ClothMesh {
  /** État initial, 3 valeurs par sommet. */
  positionsMm: Float64Array;
  /** Coordonnées à plat (état de repos), 2 valeurs par sommet. */
  flatMm: Float64Array;
  /** 3 indices de sommets par triangle. */
  triangles: Uint32Array;
  /** Droit fil à plat, vecteur unitaire, 2 valeurs par triangle. */
  grainUnit: Float64Array;
  /** Paires de sommets à coudre. */
  stitches: Uint32Array;
  /** Sommets immobiles. */
  pinned?: Uint32Array;
}

export interface BodyMesh {
  /** Surface fermée, normales vers l'extérieur par l'ordre des sommets (sens antihoraire vu de dehors). */
  positionsMm: Float64Array;
  triangles: Uint32Array;
}

export interface FabricPhysics {
  weightGPerM2: number;
  thicknessMm: number;
  /** Allongement (%) sous 10 N sur 50 mm de large, dans le sens chaîne (droit fil). */
  stretchWarpPercent: number;
  /** Idem dans le sens trame (travers du fil). */
  stretchWeftPercent: number;
  /** Rigidité de flexion par unité de largeur, en µN·m (comme la valeur B de Kawabata). */
  bendingRigidityMicroNm: number;
  frictionCoefficient: number;
}

export interface SimulationSettings {
  /** Durée d'un pas, en s. */
  stepS: number;
  /** Sous-pas par pas (une itération chacun). */
  substeps: number;
  /** Nombre de pas de la phase de couture (gravité réduite, souplesse décroissante). */
  sewingSteps: number;
  maxSteps: number;
  /** Itérations de contraintes par sous-pas (1 par défaut : « petits pas »). */
  iterations?: number;
  /** Sous cette vitesse maximale pendant 10 pas, la simulation s'arrête. */
  restSpeedMmPerS: number;
}

export interface SimulationResult {
  positionsMm: Float64Array;
  steps: number;
  converged: boolean;
  maxStitchGapMm: number;
  maxPenetrationMm: number;
}
