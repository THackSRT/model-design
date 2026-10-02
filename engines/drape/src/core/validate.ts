import { MAX_ITERATIONS } from './constants.js';
import type { BodyMesh, ClothMesh, SimulationSettings } from './types.js';

/** Maillage ou réglage invalide : rien n'est simulé. `code` permet de distinguer la cause. */
export class InvalidInputError extends RangeError {
  constructor(
    readonly code: 'mesh' | 'settings',
    message: string,
  ) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

function checkIndices(
  what: string,
  indices: ArrayLike<number>,
  perItem: number,
  vertexCount: number,
): void {
  if (indices.length % perItem !== 0) {
    throw new InvalidInputError('mesh', `${what}: length must be a multiple of ${perItem}`);
  }
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k] as number;
    if (!Number.isInteger(i) || i < 0 || i >= vertexCount) {
      throw new InvalidInputError('mesh', `${what}: index ${i} at ${k} is not a vertex`);
    }
  }
}

/** Indices entiers dans [0, vertexCount) et triangles non dégénérés (trois sommets distincts). */
export function checkTriangles(what: string, tris: ArrayLike<number>, vertexCount: number): void {
  checkIndices(what, tris, 3, vertexCount);
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    if (a === b || b === c || a === c) {
      throw new InvalidInputError('mesh', `${what}: triangle ${t / 3} repeats a vertex`);
    }
  }
}

export function validateCloth(cloth: ClothMesh): void {
  const n = cloth.flatMm.length / 2;
  if (!Number.isInteger(n) || cloth.positionsMm.length !== 3 * n) {
    throw new InvalidInputError(
      'mesh',
      'cloth.positionsMm must hold 3 values per vertex and flatMm 2',
    );
  }
  checkTriangles('cloth.triangles', cloth.triangles, n);
  if (cloth.grainUnit.length !== (2 * cloth.triangles.length) / 3) {
    throw new InvalidInputError('mesh', 'cloth.grainUnit must hold 2 values per triangle');
  }
  checkIndices('cloth.stitches', cloth.stitches, 2, n);
  checkIndices('cloth.pinned', cloth.pinned ?? [], 1, n);
}

export function validateBody(body: BodyMesh): void {
  const n = body.positionsMm.length / 3;
  if (!Number.isInteger(n)) {
    throw new InvalidInputError('mesh', 'body.positionsMm must hold 3 values per vertex');
  }
  checkTriangles('body.triangles', body.triangles, n);
}

export function validateSettings(settings: SimulationSettings): void {
  if (!(settings.stepS > 0) || !(settings.substeps >= 1) || !(settings.maxSteps >= 0)) {
    throw new InvalidInputError('settings', 'invalid simulation settings');
  }
  const it = settings.iterations;
  if (it !== undefined && !(Number.isInteger(it) && it >= 1 && it <= MAX_ITERATIONS)) {
    throw new InvalidInputError(
      'settings',
      `iterations must be an integer between 1 and ${MAX_ITERATIONS}`,
    );
  }
}
