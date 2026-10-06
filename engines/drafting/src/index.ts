// Entrée `.` du moteur : compatible navigateur et Worker, donc aucun module Node atteignable d'ici
// (test/browser-entry.test.ts le vérifie). Ce qui touche à Node passe par src/node.ts.
export { ENGINE_VERSION, FREESEWING_VERSION } from './version.js';
export { draftModel } from './draft.js';
export type { DraftRequest, DraftResult, MeasurementSource } from './draft.js';
export { MODEL_KEYS, describeModel } from './adapters/freesewing/models.js';
export type { ModelInfo, ModelKey } from './adapters/freesewing/models.js';
export { SIZE_NAMES } from './adapters/freesewing/sizes.js';
export type { SizeName } from './adapters/freesewing/sizes.js';
export {
  DERIVABLE_MEASUREMENTS,
  HPS_ABOVE_CERVICALE_RATIO,
  MAX_MEASUREMENT_MM,
  MAX_SLOPE_DEG,
  toFreeSewingMeasurements,
} from './spec/measurements.js';
export type { FreeSewingMeasurements, WantedMeasurements } from './spec/measurements.js';
export {
  ContourError,
  CoverageError,
  DraftingError,
  EdgeNotFoundError,
  FreeSewingError,
  InvalidMeasurementError,
  InvalidOptionError,
  InvalidRequestError,
  MissingMeasurementError,
  UnknownModelError,
  UnknownSizeError,
} from './core/errors.js';
export type { DraftingErrorCode, MissingMeasurement } from './core/errors.js';
export { SEMANTIC_ROLES } from './core/types.js';
export type {
  DraftedContour,
  DraftedEdge,
  DraftedPart,
  NamedVertex,
  PointMm,
  SemanticRole,
  Segment,
} from './core/types.js';
export type { EdgeSheet, ModelSheet, PartSheet } from './core/sheet.js';
export type { DraftOptions, OptionSpec, OptionValue } from './core/options.js';
