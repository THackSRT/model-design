/*
 * Types publics de l'habillage rapide. Maillage en cm (comme le corps), zones en mm depuis le sol.
 */

/** Hauteurs (mm depuis le sol) où le vêtement ne peut pas atteindre le tour du patron sans toucher le corps. */
export interface TightZone {
  fromMm: number;
  toMm: number;
  /** Plus grand écart de la zone : tour du corps moins tour fini du patron, en mm. */
  shortfallMm: number;
}

/**
 * Vêtement porté : maillage sans simulation physique. Tableaux neufs à chaque appel, propriété de
 * l'appelant (transférables à un Worker).
 */
export interface GarmentMesh {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  tightZones: TightZone[];
}

export interface DressOptions {
  /** Nombre d'anneaux sur la hauteur du vêtement (défaut 48, minimum 4). */
  rings?: number;
  /** Nombre de sommets par anneau (défaut 72, minimum 12). */
  segments?: number;
}
