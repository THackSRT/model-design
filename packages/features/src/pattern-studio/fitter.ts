import type { MeasurementSet } from '@atelier/contracts-ts';
import type { FitOptions, FittedMannequin } from '@atelier/mannequin';

/**
 * Port d'ajustement du mannequin. L'application branche un Web Worker (le calcul prend de quelques
 * centaines de ms à quelques secondes) ; les tests branchent un faux.
 */
export interface MannequinFitter {
  fit(measurements: MeasurementSet, options?: FitOptions): Promise<FittedMannequin>;
}

export type MannequinStatus = 'idle' | 'fitting' | 'ready' | 'failed';

export interface MannequinState {
  status: MannequinStatus;
  /** Dernier corps ajusté : gardé pendant un nouvel ajustement, pour ne pas vider la vue. */
  mannequin?: FittedMannequin;
}

export const initialMannequinState: MannequinState = { status: 'idle' };

/** Vues de silhouette proposées par la bascule 2D, dans l'ordre d'affichage. */
export type MannequinDisplay = '3d' | 'outline';
