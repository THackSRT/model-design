import type { MeshData } from '../scene.js';

export type SilhouetteView = 'front' | 'side' | 'back';

/** Un point du plan de la vue, en cm : `x` vers la droite de l'écran, `y` vers le haut. */
export interface Projected {
  /** Sommets projetés [x, y, x, y, …]. */
  points: Float64Array;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Abscisse d'écran d'un sommet selon la vue : face X, profil Z, dos X en miroir. */
function screenX(view: SilhouetteView, x: number, z: number): number {
  if (view === 'front') return x;
  if (view === 'back') return -x;
  return z;
}

/** Projection orthographique des sommets du maillage sur le plan de la vue (axe Y vertical). */
export function projectVertices(mesh: MeshData, view: SilhouetteView): Projected {
  const count = Math.floor(mesh.positions.length / 3);
  const points = new Float64Array(count * 2);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = screenX(view, mesh.positions[3 * i] ?? 0, mesh.positions[3 * i + 2] ?? 0);
    const y = mesh.positions[3 * i + 1] ?? 0;
    points[2 * i] = x;
    points[2 * i + 1] = y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { points, minX, maxX, minY, maxY };
}
