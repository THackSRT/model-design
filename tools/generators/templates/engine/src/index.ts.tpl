// Entrée `.` du moteur : compatible navigateur et Worker, donc aucun module Node atteignable d'ici
// (test/browser-entry.test.ts le vérifie). Ce qui touche à Node passe par src/node.ts.
export { ENGINE_VERSION } from './version.js';
export { distanceMm } from './core/example.js';
export type { PointMm } from './core/example.js';
