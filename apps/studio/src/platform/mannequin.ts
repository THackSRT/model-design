import type { MannequinFitter } from '@atelier/features';
import { createWorkerFitter } from './worker-fitter.js';

let fitter: MannequinFitter | undefined;

/** Ajusteur du mannequin : un Web Worker créé à la première demande (recréé s'il ne répond plus), données chargées une fois. */
export function getMannequinFitter(): MannequinFitter {
  fitter ??= createWorkerFitter(
    () => new Worker(new URL('./mannequin.worker.ts', import.meta.url), { type: 'module' }),
  );
  return fitter;
}
