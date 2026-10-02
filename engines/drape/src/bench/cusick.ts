// Essai de drapé de Cusick simulé (ADR 0015) : coefficient de drapé DC et contour de l'ombre.
import { simulate } from '../core/simulate.js';
import type { FabricPhysics } from '../core/types.js';
import { buildCusickTest, type CusickOptions } from './cusick-mesh.js';
import { projectedAreaMm2 } from './projected-area.js';

const DEFAULT_SECTORS = 120;

/** DC = (aire de l'ombre − aire du disque) / (aire de l'éprouvette − aire du disque), borné à [0, 1], au millième. */
export function drapeCoefficient(
  projectedAreaMm2: number,
  specimenAreaMm2: number,
  discAreaMm2: number,
): number {
  if (!(specimenAreaMm2 > discAreaMm2))
    throw new RangeError('specimen must be larger than the disc');
  const dc = (projectedAreaMm2 - discAreaMm2) / (specimenAreaMm2 - discAreaMm2);
  return Math.round(Math.min(1, Math.max(0, dc)) * 1000) / 1000;
}

/**
 * Contour de l'ombre : rayon maximal des sommets projetés par secteur angulaire, centré en (0, 0). Un secteur vide
 * prend le maximum de ses voisins. Rend 2 valeurs (x, z) par secteur, au centre angulaire du secteur.
 */
export function shadowOutlineMm(
  positionsMm: Float64Array,
  sectors = DEFAULT_SECTORS,
): Float64Array {
  if (!Number.isInteger(sectors) || sectors < 3)
    throw new RangeError('sectors must be an integer >= 3');
  const radii = new Float64Array(sectors).fill(-1);
  const step = (2 * Math.PI) / sectors;
  for (let i = 0; i < positionsMm.length / 3; i++) {
    const x = positionsMm[3 * i] as number;
    const z = positionsMm[3 * i + 2] as number;
    const s = Math.min(sectors - 1, Math.floor((Math.atan2(z, x) + Math.PI) / step));
    radii[s] = Math.max(radii[s] as number, Math.sqrt(x * x + z * z));
  }
  const filled = fillEmptySectors(radii);
  const outline = new Float64Array(2 * sectors);
  for (let s = 0; s < sectors; s++) {
    const a = -Math.PI + (s + 0.5) * step;
    outline[2 * s] = (filled[s] as number) * Math.cos(a);
    outline[2 * s + 1] = (filled[s] as number) * Math.sin(a);
  }
  return outline;
}

function fillEmptySectors(radii: Float64Array): Float64Array {
  const n = radii.length;
  const out = Float64Array.from(radii);
  for (let s = 0; s < n; s++) {
    if ((radii[s] as number) >= 0) continue;
    const neighbours = Math.max(radii[(s + n - 1) % n] as number, radii[(s + 1) % n] as number);
    out[s] = Math.max(0, neighbours);
  }
  return out;
}

export interface CusickResult {
  drapeCoefficient: number;
  converged: boolean;
  simulatedSteps: number;
  outlineMm: Float64Array;
}

/** Simule l'éprouvette de 300 mm sur le disque de 180 mm et mesure l'ombre projetée. */
export function runCusickTest(fabric: FabricPhysics, options: CusickOptions = {}): CusickResult {
  const test = buildCusickTest(fabric, options);
  const result = simulate(test.cloth, test.body, fabric, test.settings);
  const area = projectedAreaMm2(result.positionsMm, test.cloth.triangles);
  return {
    drapeCoefficient: drapeCoefficient(area, test.specimenAreaMm2, test.discAreaMm2),
    converged: result.converged,
    simulatedSteps: result.steps,
    outlineMm: shadowOutlineMm(result.positionsMm),
  };
}
