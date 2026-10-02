import type { CusickRunner } from '@atelier/features';
import { createWorkerCusickRunner } from './worker-cusick.js';

let runner: CusickRunner | undefined;

/** Essai de Cusick : un Web Worker créé à la première simulation seulement (rien au chargement de l'onglet). */
export function getCusickRunner(): CusickRunner {
  runner ??= createWorkerCusickRunner(
    () => new Worker(new URL('./cusick.worker.ts', import.meta.url), { type: 'module' }),
  );
  return runner;
}
