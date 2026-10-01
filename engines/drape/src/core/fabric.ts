import type { FabricPhysics } from './types.js';

/**
 * Préréglages de tissu. TOUTES ces valeurs sont des ESTIMATIONS plausibles (ordres de grandeur de la littérature
 * textile), à faire valider par un modéliste ou remplacer par le moteur « Tissu numérique ».
 */
export const FABRIC_PRESETS = {
  'cotton-poplin': {
    weightGPerM2: 120,
    thicknessMm: 0.2,
    stretchWarpPercent: 2,
    stretchWeftPercent: 3,
    bendingRigidityMicroNm: 6,
    frictionCoefficient: 0.35,
  },
  'cotton-wax': {
    weightGPerM2: 180,
    thicknessMm: 0.3,
    stretchWarpPercent: 2,
    stretchWeftPercent: 3,
    bendingRigidityMicroNm: 20,
    frictionCoefficient: 0.5,
  },
  bazin: {
    weightGPerM2: 130,
    thicknessMm: 0.25,
    stretchWarpPercent: 1.5,
    stretchWeftPercent: 2,
    bendingRigidityMicroNm: 25,
    frictionCoefficient: 0.3,
  },
  linen: {
    weightGPerM2: 150,
    thicknessMm: 0.35,
    stretchWarpPercent: 1.5,
    stretchWeftPercent: 2.5,
    bendingRigidityMicroNm: 14,
    frictionCoefficient: 0.45,
  },
  denim: {
    weightGPerM2: 340,
    thicknessMm: 0.6,
    stretchWarpPercent: 1.5,
    stretchWeftPercent: 2.5,
    bendingRigidityMicroNm: 80,
    frictionCoefficient: 0.5,
  },
  'silk-satin': {
    weightGPerM2: 90,
    thicknessMm: 0.15,
    stretchWarpPercent: 3,
    stretchWeftPercent: 5,
    bendingRigidityMicroNm: 2.5,
    frictionCoefficient: 0.2,
  },
  jersey: {
    weightGPerM2: 160,
    thicknessMm: 0.45,
    stretchWarpPercent: 12,
    stretchWeftPercent: 30,
    bendingRigidityMicroNm: 3,
    frictionCoefficient: 0.5,
  },
} as const satisfies Record<string, FabricPhysics>;

export type FabricPresetName = keyof typeof FABRIC_PRESETS;

/** Paramètres de la simulation, en g, mm, s. */
export interface XpbdParams {
  /** Masse surfacique, g/mm². */
  massPerAreaGPerMm2: number;
  /** Raideur de tension par unité de largeur, g/s² (= force par mm de largeur et par unité d'allongement). */
  stretchWarpGPerS2: number;
  stretchWeftGPerS2: number;
  /** Rigidité de flexion par unité de largeur, g·mm²/s². */
  bendingGMm2PerS2: number;
  frictionCoefficient: number;
  thicknessMm: number;
}

/** Charge de l'essai de bande (Kawabata) : 10 N sur 50 mm de large, en g·mm/s² (1 N = 1e6 g·mm/s²). */
const STRIP_LOAD = 10 * 1e6;
const STRIP_WIDTH_MM = 50;
/** Allongement minimal retenu (%), pour garder une souplesse finie. */
const MIN_STRETCH_PERCENT = 0.2;

/**
 * Conversion des unités physiques vers les raideurs XPBD :
 * - masse : g/m² × 1e-6 = g/mm² ;
 * - tension : T = 10 N / 50 mm = 2e5 g/s² par mm de largeur ; allongement ε = pourcentage / 100 ; raideur
 *   par unité de largeur K = T / ε (g/s²). La souplesse XPBD d'une arête est 1/k avec k = K · aire / longueur²
 *   (voir topology.ts) ;
 * - flexion : 1 µN·m = 1e-6 N·m = 1e-6 × 1e9 g·mm²/s² = 1e3 g·mm²/s².
 */
export function toXpbdParams(fabric: FabricPhysics): XpbdParams {
  const perStrain = STRIP_LOAD / STRIP_WIDTH_MM;
  const warp = Math.max(fabric.stretchWarpPercent, MIN_STRETCH_PERCENT) / 100;
  const weft = Math.max(fabric.stretchWeftPercent, MIN_STRETCH_PERCENT) / 100;
  return {
    massPerAreaGPerMm2: fabric.weightGPerM2 * 1e-6,
    stretchWarpGPerS2: perStrain / warp,
    stretchWeftGPerS2: perStrain / weft,
    bendingGMm2PerS2: fabric.bendingRigidityMicroNm * 1e3,
    frictionCoefficient: fabric.frictionCoefficient,
    thicknessMm: fabric.thicknessMm,
  };
}
