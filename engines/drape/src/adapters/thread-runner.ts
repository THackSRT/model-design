import { Worker } from 'node:worker_threads';
import type { DrapeJob } from '@atelier/contracts-ts';
import type { ComputeResult } from './compute.js';
import type { ThreadRequest } from './drape-thread.js';

/** Exécute un calcul de drapé. Rejette si le calcul est interrompu ou si le fil s'arrête (le message sera renvoyé). */
export interface DrapeRunner {
  run(job: DrapeJob, cacheKey: string): Promise<ComputeResult>;
  /** Interrompt le calcul en cours (arrêt du processus). */
  terminate(): Promise<void>;
}

interface Pending {
  resolve(result: ComputeResult): void;
  reject(error: Error): void;
}

/** Un fil de calcul, créé à la demande et recréé après une défaillance. Un calcul à la fois. */
export class ThreadRunner implements DrapeRunner {
  private worker: Worker | undefined;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  private spawn(): Worker {
    const worker = new Worker(new URL('./drape-thread.js', import.meta.url));
    worker.on('message', (message: { id: number; result?: ComputeResult }) => {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.result) pending?.resolve(message.result);
      else pending?.reject(new Error('Calcul de drapé en échec.'));
    });
    const lost = (): void => {
      if (this.worker === worker) this.worker = undefined;
      for (const pending of this.pending.values())
        pending.reject(new Error('Fil de drapé arrêté.'));
      this.pending.clear();
    };
    worker.on('error', lost);
    worker.on('exit', lost);
    return worker;
  }

  run(job: DrapeJob, cacheKey: string): Promise<ComputeResult> {
    this.worker ??= this.spawn();
    const id = this.nextId++;
    const request: ThreadRequest = { id, job, cacheKey };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker?.postMessage(request);
    });
  }

  async terminate(): Promise<void> {
    await this.worker?.terminate();
  }
}
