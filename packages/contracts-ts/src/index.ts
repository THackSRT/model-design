// Point d'entrée écrit à la main : il ne fait que rassembler le code généré.
export type * from './generated/schemas/index.js';
export { jsonSchemas } from './generated/schemas/json.js';
// finishing-options référence GarmentSpec (NotchPlacement) : le générateur n'en exporte plus que la racine.
export type {
  EdgeAllowance,
  NotchRequest,
  RoleAllowances,
  SeamAllowances,
} from './generated/schemas/finishing-options.js';
export type {
  paths as DesignsApiPaths,
  components as DesignsApiComponents,
} from './generated/openapi/designs.js';
export type {
  paths as PatterningApiPaths,
  components as PatterningApiComponents,
} from './generated/openapi/patterning.js';
