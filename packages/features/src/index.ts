export { type ApiProblem, createDesignsClient, type DesignsClient } from './api/designs-client.js';
export {
  DRAFTED_GARMENT_TYPES,
  type DraftedGarmentType,
  GARMENT_TYPES,
  type GarmentField,
  garmentFields,
  initialParams,
  isDraftedGarmentType,
  type ParamValues,
} from './pattern-studio/garment-fields.js';
export {
  type FieldError,
  type FieldErrors,
  initialForm,
  MEASUREMENT_KEYS,
  measurementKeys,
  type MeasurementKey,
  type StudioForm,
  toVersionRequest,
} from './pattern-studio/form.js';
export {
  initialMannequinState,
  type MannequinDisplay,
  type MannequinFitter,
  type MannequinState,
  type MannequinStatus,
} from './pattern-studio/fitter.js';
export {
  generate,
  type GenerationResult,
  type PatternStudioDeps,
} from './pattern-studio/generate.js';
export { layoutPanels, type PanelShape, type PanelsLayout } from './pattern-studio/panels.js';
export {
  type PatternStudioActions,
  type PatternStudioState,
  type StudioStatus,
  usePatternStudio,
} from './pattern-studio/use-pattern-studio.js';
