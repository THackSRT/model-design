// Entrée réservée à Node (`@atelier/drape/node`) : l'avatar lit le fichier MakeHuman et charge le moteur mannequin,
// ce que le navigateur ne peut pas faire. L'entrée `.` reste compatible navigateur (test/browser-entry.test.ts).
export { loadAvatarEngine, buildAvatar, buildBody } from './body/avatar.js';
export { weldBody } from './body/weld.js';
export { PlacementError } from './placement/types.js';
export type { AvatarArm, AvatarShape, Landmark, PlacementCode } from './placement/types.js';
export { assertPlacements, placeGarment } from './placement/place-garment.js';
export { keepClearOfBody, MIN_START_GAP_MM, MAX_PUSH_MM } from './placement/clearance.js';
export type { ClearanceReport } from './placement/clearance.js';
export { drapeGarment } from './drape/drape-garment.js';
export type {
  DrapeOptions,
  DrapeOutcome,
  DrapeResultCore,
  DrapeSuccess,
} from './drape/drape-garment.js';
