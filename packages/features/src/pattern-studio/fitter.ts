import type { GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import type { DressOptions, FitOptions, FittedMannequin, GarmentMesh } from '@atelier/mannequin';

/**
 * Port d'ajustement du mannequin. L'application branche un Web Worker (le calcul prend de quelques
 * centaines de ms à quelques secondes) ; les tests branchent un faux.
 */
export interface MannequinFitter {
  fit(measurements: MeasurementSet, options?: FitOptions): Promise<FittedMannequin>;
  /**
   * Habille le dernier corps ajusté avec le patron (le Worker garde ce corps) : maillage du
   * vêtement et zones trop justes. Échoue si aucun corps n'a été ajusté.
   */
  dress(spec: GarmentSpec, garmentType: string, options?: DressOptions): Promise<GarmentMesh>;
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

/** Vêtement porté sur le mannequin : état du calcul d'habillage. */
export interface DressingState {
  status: 'idle' | 'working' | 'ready' | 'failed';
  garment?: GarmentMesh;
}

export const initialDressingState: DressingState = { status: 'idle' };

/**
 * Angle des bras de l'avatar, depuis la verticale : bras à l'horizontale (pose en T). Seule constante
 * d'angle du studio : ajustement du corps habillé, demande de drapé et corps du drapé.
 */
export const AVATAR_ARM_ANGLE_DEG = 90;

/** Options d'ajustement de l'avatar, les mêmes dans toutes les vues. */
export const AVATAR_FIT_OPTIONS: FitOptions = { armAngleDeg: AVATAR_ARM_ANGLE_DEG };
