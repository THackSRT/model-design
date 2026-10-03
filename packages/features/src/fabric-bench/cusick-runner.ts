import type { FabricPhysics } from '@atelier/drape';

/** Résultat d'un essai de drapé de Cusick simulé (le contour sert à la vue de dessus de l'écran). */
export interface CusickRun {
  drapeCoefficient: number;
  converged: boolean;
  simulatedSteps: number;
  /** Contour de l'ombre, en mm ; vide pour un essai relu d'un rapport (le contrat ne garde pas le contour). */
  outlineMm: Float64Array;
  engineVersion: string;
}

/** Port de l'essai de Cusick : l'application le branche (Web Worker), les tests un faux. */
export interface CusickRunner {
  run(fabric: FabricPhysics): Promise<CusickRun>;
}

export type DrapeWhich = 'estimated' | 'candidate';

/** État d'un essai simulé ; `fabric` est le tissu simulé, pour écarter un résultat périmé. */
export interface DrapeTest {
  status: 'idle' | 'running' | 'ready' | 'failed';
  fabric?: FabricPhysics;
  run?: CusickRun;
}

export const IDLE_DRAPE: DrapeTest = { status: 'idle' };
