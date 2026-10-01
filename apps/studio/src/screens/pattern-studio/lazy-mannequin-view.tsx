import { lazy } from 'react';

/** La vue 3D (three.js, ~800 kB) est chargée à la demande, hors du paquet initial. */
export const LazyMannequinView = lazy(async () => ({
  default: (await import('@atelier/viewer3d')).MannequinView,
}));
