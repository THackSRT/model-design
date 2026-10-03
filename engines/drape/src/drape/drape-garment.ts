import type { DrapeJob, DrapeResult } from '@atelier/contracts-ts';
import { buildAvatar } from '../body/avatar.js';
import { isFabricEstimated, resolveFabric } from '../core/fabric.js';
import { simulate } from '../core/simulate.js';
import type { ClothMesh, SimulationResult } from '../core/types.js';
import { meshGarment, type GarmentMesh } from '../mesh/garment-mesh.js';
import { garmentHolds } from '../placement/holds.js';
import { keepClearOfBody } from '../placement/clearance.js';
import { assertPlacements, placeGarmentReport } from '../placement/place-garment.js';
import type { AvatarShape } from '../placement/types.js';
import { ENGINE_VERSION } from '../version.js';
import { vertexAreas, vertexEase, vertexStrain } from './metrics.js';
import { problemOf, type DrapeProblem } from './problems.js';
import {
  settingsFor,
  MAX_STEPS_LIMIT,
  PENETRATION_TOLERANCE_MM,
  SEAM_TOLERANCE_MM,
  TIGHT_EASE_MM,
} from './settings.js';

/** `DrapeResult` du contrat sans ce qu'ajoute la sortie glTF (1.19f) : clé, taille et empreinte du modèle. */
export type DrapeResultCore = Omit<DrapeResult, 'modelKey' | 'sizeBytes' | 'sha256'>;

export interface DrapeOptions {
  /** Nombre de pas maximal (borné à `MAX_STEPS_LIMIT`) ; par défaut celui de la qualité. */
  maxSteps?: number;
}

export interface DrapeSuccess {
  ok: true;
  result: DrapeResultCore;
  /** Positions finales, mm, 3 par sommet (y vers le haut), arrondies à 0,1 mm. */
  positionsMm: Float32Array;
  /** Aisance par sommet, mm : distance au corps moins l'épaisseur du tissu. */
  easeMm: Float32Array;
  /** Allongement relatif par sommet (0,01 = 1 %) : le plus grand de ses arêtes. */
  strain: Float32Array;
  /** Vêtement maillé à plat (pièces, coutures, triangles) : mêmes indices de sommets que les tableaux ci-dessus. */
  mesh: GarmentMesh;
  /** Mesures de contrôle, mm. */
  diagnostics: { maxStitchGapMm: number; maxPenetrationMm: number; startPushedVertices: number };
}

export type DrapeOutcome = DrapeSuccess | { ok: false; problem: DrapeProblem };

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

function median(sorted: Float32Array): number {
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2] as number;
  return ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
}

/** Résumé de l'aisance (bornes du contrat : -1 000 à 2 000 mm, surface jusqu'à 1e8 mm²). */
function summarizeEase(ease: Float32Array, areas: Float64Array): DrapeResultCore['ease'] {
  const sorted = Float32Array.from(ease).sort();
  let tight = 0;
  for (let v = 0; v < ease.length; v++) {
    if ((ease[v] as number) <= TIGHT_EASE_MM) tight += areas[v] as number;
  }
  return {
    minMm: clamp(sorted[0] as number, -1000, 2000),
    medianMm: clamp(median(sorted), -1000, 2000),
    maxMm: clamp(sorted[sorted.length - 1] as number, -1000, 2000),
    tightAreaMm2: clamp(tight, 0, 1e8),
  };
}

/** Arrondi à 0,1 mm des positions finales (ADR 0013). */
const rounded = (positions: Float64Array): Float32Array =>
  Float32Array.from(positions, (x) => Math.round(x * 10) / 10);

export function problemAfter(sim: SimulationResult): DrapeProblem | undefined {
  if (sim.maxStitchGapMm > SEAM_TOLERANCE_MM) return { type: 'seam-not-closed' };
  if (sim.maxPenetrationMm > PENETRATION_TOLERANCE_MM) return { type: 'body-penetration' };
  return undefined;
}

function indicators(job: DrapeJob, avatar: AvatarShape, cloth: ClothMesh, sim: SimulationResult) {
  const thickness = resolveFabric(job.fabric).thicknessMm;
  const easeMm = vertexEase(sim.positionsMm, avatar.body, thickness);
  const strain = vertexStrain(cloth, sim.positionsMm);
  const maxStrain = strain.reduce((m, s) => Math.max(m, s), -Infinity);
  const result: DrapeResultCore = {
    ease: summarizeEase(easeMm, vertexAreas(cloth, sim.positionsMm)),
    maxStrainPercent: clamp(maxStrain * 100, -100, 1000),
    fabricEstimated: isFabricEstimated(job.fabric),
    engineVersion: ENGINE_VERSION,
    vertexCount: cloth.flatMm.length / 2,
    simulatedSteps: sim.steps,
    converged: sim.converged,
  };
  return { result, easeMm, strain };
}

function run(job: DrapeJob, options: DrapeOptions): DrapeOutcome {
  assertPlacements(job.spec);
  const mesh = meshGarment(job.spec, job.quality);
  const avatar = buildAvatar(job.measurements, job.avatar);
  const { positionsMm: start, flareRatio } = placeGarmentReport(mesh, job.spec, avatar);
  const clearance = keepClearOfBody(start, avatar.body);
  const settings = settingsFor(job.quality, flareRatio);
  settings.maxSteps = clamp(options.maxSteps ?? settings.maxSteps, 0, MAX_STEPS_LIMIT);
  const holds = garmentHolds(mesh, job.spec, avatar, start);
  const cloth: ClothMesh = { ...mesh.cloth, positionsMm: start, ...(holds ? { holds } : {}) };
  const sim = simulate(cloth, avatar.body, resolveFabric(job.fabric), settings);
  const problem = problemAfter(sim);
  if (problem) return { ok: false, problem };
  return {
    ok: true,
    ...indicators(job, avatar, cloth, sim),
    positionsMm: rounded(sim.positionsMm),
    mesh,
    diagnostics: {
      maxStitchGapMm: sim.maxStitchGapMm,
      maxPenetrationMm: sim.maxPenetrationMm,
      startPushedVertices: clearance.pushed,
    },
  };
}

/**
 * Drape le vêtement du travail sur l'avatar recalculé depuis ses mesures (ADR 0013) : maillage à plat, mise en place
 * autour du corps, simulation, indicateurs. Déterministe. Rend un problème typé pour un échec attendu
 * (`placement-missing`, `placement-failed`, `seam-not-closed`, `body-penetration`, `drape-too-large`,
 * `invalid-input`) ; toute autre erreur est un bogue et se propage. `loadAvatarEngine()` doit avoir été attendu.
 * Jamais de mesure dans un message d'erreur.
 */
export function drapeGarment(job: DrapeJob, options: DrapeOptions = {}): DrapeOutcome {
  try {
    return run(job, options);
  } catch (error) {
    const problem = problemOf(error);
    if (problem === undefined) throw error;
    return { ok: false, problem };
  }
}
