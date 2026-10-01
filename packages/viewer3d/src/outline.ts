// Point d'entrée sans three.js : silhouettes en trait seulement (le paquet initial ne tire pas la 3D).
export type { MeshData } from './scene.js';
export {
  silhouettePaths,
  simplifyLine,
  simplifyLoop,
  type Silhouette,
  type SilhouetteOptions,
  type SilhouetteView,
} from './silhouette/index.js';
export { MannequinOutline, type MannequinOutlineProps } from './mannequin-outline.js';
