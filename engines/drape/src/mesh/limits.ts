// Finesse du maillage et limites de taille (ADR 0013). Longueurs en mm.

/** Finesse du maillage, noms du contrat (`DrapeJob.quality`). */
export type MeshQuality = 'draft' | 'standard';

/** Pas h du maillage (longueur d'arête visée), en mm. */
export const MESH_EDGE_MM: Readonly<Record<MeshQuality, number>> = {
  draft: 25,
  standard: 15,
};

/** Pièces (au sens du contrat, avant copies et dépliage) au plus, pour un vêtement (ADR 0013). */
export const MAX_PANELS_PER_GARMENT = 40;
/**
 * Coordonnées (x, y) des points d'une pièce, en valeur absolue, au plus, en mm (10 m ; un patron réel fait au plus
 * 2 m environ). Au-delà, les boucles à pas flottant ne progressent plus et les tailles explosent.
 */
export const MAX_COORDINATE_MM = 10_000;
/**
 * Coutures au plus, pour un vêtement : 10 fois les 20 coutures de la plus grosse référence (pantalon), pour 40 pièces
 * au plus.
 */
export const MAX_SEAMS_PER_GARMENT = 200;
/** Bords de pièce au plus, pour un vêtement. */
export const MAX_EDGES_PER_GARMENT = 2000;
/** Sommets de maillage au plus, pour un vêtement. */
export const MAX_VERTICES_PER_GARMENT = 30000;

/** Vêtement trop gros pour être drapé : `code` vaut toujours `'drape-too-large'`. */
export class DrapeTooLargeError extends RangeError {
  readonly code = 'drape-too-large';
  constructor(message: string) {
    super(message);
    this.name = 'DrapeTooLargeError';
  }
}

/** Lève `DrapeTooLargeError` si le nombre de bords ou de sommets dépasse les limites par vêtement. */
export function assertWithinDrapeLimits(edgeCount: number, vertexCount: number): void {
  if (edgeCount > MAX_EDGES_PER_GARMENT) {
    throw new DrapeTooLargeError(`${edgeCount} edges exceed the limit of ${MAX_EDGES_PER_GARMENT}`);
  }
  if (vertexCount > MAX_VERTICES_PER_GARMENT) {
    throw new DrapeTooLargeError(
      `${vertexCount} vertices exceed the limit of ${MAX_VERTICES_PER_GARMENT}`,
    );
  }
}

/** Lève `DrapeTooLargeError` si `count` dépasse `maxVertices` (reste du budget de sommets du vêtement). */
export function assertVertexBudget(count: number, maxVertices: number): void {
  if (!(count <= maxVertices)) {
    throw new DrapeTooLargeError(`${count} vertices exceed the budget of ${maxVertices}`);
  }
}
