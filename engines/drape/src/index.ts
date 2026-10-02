export { ENGINE_VERSION } from './version.js';
export { simulate } from './core/simulate.js';
export { InvalidInputError } from './core/validate.js';
export { MAX_ITERATIONS } from './core/constants.js';
export {
  FABRIC_PRESETS,
  FABRIC_PRESET_STATUS,
  isFabricEstimated,
  resolveFabric,
  toXpbdParams,
} from './core/fabric.js';
export type { FabricPresetName, FabricPresetStatus, XpbdParams } from './core/fabric.js';
export {
  REFERENCE_STRIP_TENSION_N_PER_MM,
  STANDARD_GRAVITY_M_PER_S2,
  bendingLengthMm,
  bendingRigidityMicroNm,
  deriveFabricValues,
  frictionFromSlideAngles,
  grammageGPerM2,
  meanThicknessMm,
  stripStretch,
} from './bench/workshop.js';
export type { StripStretchResult } from './bench/workshop.js';
export {
  BENCH_TOLERANCES,
  DRAPE_COEFFICIENT_TOLERANCE,
  FABRIC_PROPERTIES,
  candidateFabric,
  compareToEstimate,
  drapeCoefficientWithinTolerance,
} from './bench/compare.js';
export type {
  CandidateFabric,
  Deviation,
  FabricBounds,
  FabricProperty,
  Tolerance,
} from './bench/compare.js';
export {
  CUSICK_DISC_DIAMETER_MM,
  CUSICK_SPECIMEN_DIAMETER_MM,
  buildCusickTest,
} from './bench/cusick-mesh.js';
export type { CusickEdgeMm, CusickOptions, CusickTest } from './bench/cusick-mesh.js';
export { projectedAreaMm2 } from './bench/projected-area.js';
export { drapeCoefficient, runCusickTest, shadowOutlineMm } from './bench/cusick.js';
export type { CusickResult } from './bench/cusick.js';
export type {
  BodyMesh,
  ClothMesh,
  FabricPhysics,
  SimulationResult,
  SimulationSettings,
} from './core/types.js';
