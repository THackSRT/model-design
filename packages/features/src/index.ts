export {
  type ApiProblem,
  createDesignsClient,
  type DesignsClient,
  type ExportedFile,
} from './api/designs-client.js';
export { exportFileName } from './api/file-name.js';
export {
  type CutPieceLabel,
  type CutPieceShape,
  type CutPiecesLayout,
  layoutCutPieces,
} from './cut-pieces/layout.js';
export {
  type CutPiecesActions,
  type CutPiecesDeps,
  type CutPiecesState,
  EXPORT_FORMATS,
  type ExportState,
  type FileSaver,
  useCutPieces,
  type VersionRef,
} from './cut-pieces/use-cut-pieces.js';
export {
  DRAFTED_GARMENT_TYPES,
  type DraftedGarmentType,
  GARMENT_TYPES,
  type GarmentField,
  garmentFields,
  initialParams,
  initialSleeve,
  sleeveFields,
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
  type DressingState,
  initialDressingState,
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
export { roundZones, type DressingInput } from './pattern-studio/use-dressing.js';
export { layoutPanels, type PanelShape, type PanelsLayout } from './pattern-studio/panels.js';
export {
  type PatternStudioActions,
  type PatternStudioState,
  type StudioStatus,
  usePatternStudio,
} from './pattern-studio/use-pattern-studio.js';
export {
  FABRIC_REPORT_MAX_BYTES,
  parseFabricValidationReport,
  type ReportImportError,
  serializeFabricValidationReport,
} from './fabric-bench/report-file.js';
export { checkSchema, type SchemaKey, type SchemaViolation } from './fabric-bench/schema-check.js';
export {
  type BenchField,
  BENCH_TESTS,
  BENCH_TEST_KEYS,
  type BenchTest,
  type BenchTestKey,
} from './fabric-bench/measurement-fields.js';
export {
  type BenchDraft,
  type BenchError,
  type BenchErrors,
  buildMeasurements,
  type DraftValue,
  draftFromMeasurements,
} from './fabric-bench/measurement-draft.js';
export {
  COMMENT_MAX_LENGTH,
  type CorrectedDraft,
  type CorrectedErrors,
  FABRIC_BOUNDS,
  roundToThreeDigits,
  validateCorrected,
} from './fabric-bench/fabric-bounds.js';
export {
  type DrapeEvidence,
  suggestVerdict,
  type Verdict,
  VERDICTS,
} from './fabric-bench/verdict.js';
export {
  type DrapeComparison,
  PRESET_NAMES,
  type PresetBenchState,
} from './fabric-bench/bench-model.js';
export {
  type CusickRun,
  type CusickRunner,
  type DrapeTest,
  type DrapeWhich,
} from './fabric-bench/cusick-runner.js';
export {
  fromReport,
  type ImportedReport,
  type ImportNotice,
  toReport,
} from './fabric-bench/report-mapping.js';
export {
  type FabricBenchActions,
  type FabricBenchDeps,
  type FabricBenchState,
  useFabricBench,
} from './fabric-bench/use-fabric-bench.js';
