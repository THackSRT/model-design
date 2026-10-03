import { lazy } from 'react';

/** Le banc d'essai (moteur de drapé, essais, rapport) est chargé à la demande, hors du paquet initial. */
export const LazyFabricBench = lazy(async () => ({
  default: (await import('./screen.js')).FabricBenchScreen,
}));
