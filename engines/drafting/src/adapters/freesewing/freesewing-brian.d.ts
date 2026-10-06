// Types de `@freesewing/brian` 4.10.2, qui n'a pas de types (ADR 0019, défaut P4) : la seule surface utilisée.
// Branché par `paths` dans tsconfig.json ; le module reste celui de node_modules à l'exécution.
import type { FsDesign } from './types.js';

/** Brian, le bloc de base homme : devant, dos et manche (`library.sleeve`). */
export declare const Brian: FsDesign;
