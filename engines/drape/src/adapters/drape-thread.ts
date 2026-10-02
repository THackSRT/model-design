import { parentPort } from 'node:worker_threads';
import type { DrapeJob } from '@atelier/contracts-ts';
import { computeDrape } from './compute.js';

// Point d'entrée du fil de calcul. Le résultat ne contient ni mesure ni message d'erreur.

export interface ThreadRequest {
  id: number;
  job: DrapeJob;
  cacheKey: string;
}

parentPort?.on('message', (request: ThreadRequest) => {
  computeDrape(request.job, request.cacheKey).then(
    (result) => parentPort?.postMessage({ id: request.id, result }),
    () => parentPort?.postMessage({ id: request.id, failed: true }),
  );
});
