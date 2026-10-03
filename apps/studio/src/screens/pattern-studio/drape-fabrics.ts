import type { DrapeFabric } from '@atelier/features';

export type DrapePreset = DrapeFabric['preset'];

/**
 * Préréglages proposés, dans l'ordre du banc d'essai. La liste est écrite ici (et non lue de `PRESET_NAMES`)
 * pour que le moteur de drapé reste hors du paquet d'entrée ; un test la compare à celle du banc.
 */
export const DRAPE_PRESETS = [
  'cotton-poplin',
  'cotton-wax',
  'bazin',
  'linen',
  'denim',
  'silk-satin',
  'jersey',
] as const satisfies readonly DrapePreset[];

export const DEFAULT_DRAPE_PRESET: DrapePreset = 'cotton-poplin';
