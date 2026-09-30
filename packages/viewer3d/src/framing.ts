/** Boîte englobante d'un ensemble de sommets [x, y, z, x, y, z, …]. */
export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export function boundsOf(positions: Float32Array[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const array of positions) {
    for (let i = 0; i < array.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const v = array[i + axis] ?? 0;
        min[axis] = Math.min(min[axis] ?? v, v);
        max[axis] = Math.max(max[axis] ?? v, v);
      }
    }
  }
  return { min, max };
}

/** Distance de caméra pour voir toute la hauteur de la boîte avec un champ vertical donné (degrés). */
export function cameraDistance(bounds: Bounds, fovDeg: number, margin = 1.15): number {
  const height = bounds.max[1] - bounds.min[1];
  return ((height / 2) * margin) / Math.tan((fovDeg * Math.PI) / 360);
}
