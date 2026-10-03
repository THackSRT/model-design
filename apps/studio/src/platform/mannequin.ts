import { createWorkerFitter, type StudioFitter } from './worker-fitter.js';

let fitter: StudioFitter | undefined;

/** Ajusteur du mannequin : un Web Worker créé à la première demande (recréé s'il ne répond plus), données chargées une fois. */
export function getMannequinFitter(): StudioFitter {
  fitter ??= createWorkerFitter(
    () => new Worker(new URL('./mannequin.worker.ts', import.meta.url), { type: 'module' }),
  );
  return fitter;
}
