import type { MannequinFitter } from '@atelier/features';
import type { WorkerRequest, WorkerResponse } from './fit-protocol.js';

/** Ce dont l'adaptateur a besoin d'un Worker (permet de le tester sans navigateur). */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  addEventListener(type: 'error' | 'messageerror', listener: (event: Event) => void): void;
}

export interface WorkerFitterOptions {
  /** Délai maximal d'une demande, en ms ; au-delà, elle est rejetée et le worker est recréé. */
  timeoutMs?: number;
}

export const DEFAULT_FIT_TIMEOUT_MS = 30_000;

interface Waiting {
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
}

/** Un worker vivant et ses demandes en attente ; `kill` le juge mort et rejette tout. */
class WorkerSession {
  private readonly waiting = new Map<number, Waiting>();
  private alive = true;
  private readonly worker: WorkerLike;

  constructor(createWorker: () => WorkerLike) {
    this.worker = createWorker();
    this.worker.addEventListener('message', (event) => {
      const entry = this.waiting.get(event.data.id);
      this.waiting.delete(event.data.id);
      entry?.resolve(event.data);
    });
    this.worker.addEventListener('error', (event) =>
      this.kill((event as ErrorEvent).message || 'worker error'),
    );
    this.worker.addEventListener('messageerror', () => this.kill('worker message error'));
  }

  get isAlive(): boolean {
    return this.alive;
  }

  send(request: WorkerRequest, waiting: Waiting): void {
    this.waiting.set(request.id, waiting);
    this.worker.postMessage(request);
  }

  kill(reason: string): void {
    if (!this.alive) return;
    this.alive = false;
    this.worker.terminate();
    for (const entry of this.waiting.values()) entry.reject(new Error(reason));
    this.waiting.clear();
  }
}

/**
 * Adaptateur du port `MannequinFitter` : un message par demande, réponse retrouvée par son id.
 * Un worker qui plante, renvoie un message illisible ou ne répond plus est jugé mort : les demandes
 * en cours sont rejetées et un nouveau worker est créé à la demande suivante.
 */
export function createWorkerFitter(
  createWorker: () => WorkerLike,
  { timeoutMs = DEFAULT_FIT_TIMEOUT_MS }: WorkerFitterOptions = {},
): MannequinFitter {
  let session: WorkerSession | undefined;
  let nextId = 0;
  async function call(build: (id: number) => WorkerRequest): Promise<WorkerResponse> {
    if (!session?.isAlive) session = new WorkerSession(createWorker);
    const current = session;
    nextId += 1;
    const request = build(nextId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const response = await new Promise<WorkerResponse>((resolve, reject) => {
      timer = setTimeout(() => current.kill('worker timeout'), timeoutMs);
      current.send(request, { resolve, reject });
    }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error(response.message);
    return response;
  }
  return {
    async fit(measurements, options) {
      const response = await call((id) => ({ id, measurements, options }));
      if (!('mannequin' in response)) throw new Error('unexpected worker response');
      return response.mannequin;
    },
    async dress(spec, garmentType, options) {
      const response = await call((id) => ({
        kind: 'dress',
        id,
        spec,
        garment: { type: garmentType },
        options,
      }));
      if (!('garment' in response)) throw new Error('unexpected worker response');
      return response.garment;
    },
  };
}
