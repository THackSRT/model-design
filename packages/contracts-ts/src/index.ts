// Point d'entrée écrit à la main : il ne fait que rassembler le code généré.
export type * from './generated/schemas/index.js';
export * from './generated/schemas/json.js';
// finishing-options référence GarmentSpec (NotchPlacement) : le générateur n'en exporte plus que la racine.
export type {
  EdgeAllowance,
  NotchRequest,
  RoleAllowances,
  SeamAllowances,
} from './generated/schemas/finishing-options.js';
// cut-pattern et export-request référencent GarmentSpec : leurs sous-types utiles au studio et à designs.
export type {
  Bounds,
  CutPiece,
  EngineRef,
  NotchMark,
  SeamLineEdge,
} from './generated/schemas/cut-pattern.js';
export type { ExportFormat } from './generated/schemas/export-request.js';
// design-version-changes référence le résumé de version : ses lignes de différence, utiles à designs et au studio.
export type { MeasurementChange, ParamChange } from './generated/schemas/design-version-changes.js';
export type {
  paths as ManufacturingApiPaths,
  components as ManufacturingApiComponents,
} from './generated/openapi/manufacturing.js';
export type {
  paths as DesignsApiPaths,
  components as DesignsApiComponents,
} from './generated/openapi/designs.js';
export type {
  paths as PatterningApiPaths,
  components as PatterningApiComponents,
} from './generated/openapi/patterning.js';
