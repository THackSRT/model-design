import type { CusickRun, CusickRunner } from '@atelier/features';
import type { CusickRequest, CusickResponse } from './cusick-protocol.js';

/** Ce dont l'adaptateur a besoin d'un Worker (permet de le tester sans navigateur). */
export interface CusickWorkerLike {
  postMessage(message: CusickRequest): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<CusickResponse>) => void): void;
  addEventListener(type: 'error' | 'messageerror', listener: (event: Event) => void): void;
}

export interface WorkerCusickOptions {
  /** Délai maximal d'un essai, en ms ; au-delà, il est rejeté et le worker est recréé. */
  timeoutMs?: number;
  /** Finesse du maillage ; 7,5 mm par défaut (environ 2 s par essai). */
  edgeMm?: CusickRequest['edgeMm'];
}

export const DEFAULT_CUSICK_TIMEOUT_MS = 60_000;
/** Nombre maximal d'envois d'une demande (le premier + une relance après la mort du worker). */
export const MAX_CUSICK_ATTEMPTS = 2;

interface Waiting {
  resolve: (response: CusickResponse) => void;
  reject: (error: Error) => void;
}

/** Le worker a planté : la demande peut être renvoyée à un worker neuf. */
class WorkerDiedError extends Error {}

/** Un worker vivant et ses demandes en attente ; `kill` le juge mort et rejette tout. */
class Session {
  private readonly waiting = new Map<number, Waiting>();
  private alive = true;
  private readonly worker: CusickWorkerLike;

  constructor(createWorker: () => CusickWorkerLike) {
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

  send(request: CusickRequest, waiting: Waiting): void {
    this.waiting.set(request.id, waiting);
    this.worker.postMessage(request);
  }

  kill(reason: string, error: Error = new WorkerDiedError(reason)): void {
    if (!this.alive) return;
    this.alive = false;
    this.worker.terminate();
    for (const entry of this.waiting.values()) entry.reject(error);
    this.waiting.clear();
  }
}

interface Job {
  fabric: CusickRequest['fabric'];
  resolve: (run: CusickRun) => void;
  reject: (error: Error) => void;
}

type Fabric = CusickRequest['fabric'];

/** Envoie les essais un par un au worker courant (le recrée s'il est mort) ; le délai court à partir de l'envoi. */
class Sender {
  private session: Session | undefined;
  private nextId = 0;

  constructor(
    private readonly createWorker: () => CusickWorkerLike,
    private readonly timeoutMs: number,
    private readonly edgeMm: CusickRequest['edgeMm'],
  ) {}

  private current(): Session {
    if (!this.session?.isAlive) this.session = new Session(this.createWorker);
    return this.session;
  }

  private send(fabric: Fabric): Promise<CusickResponse> {
    const worker = this.current();
    this.nextId += 1;
    const request = { id: this.nextId, fabric, edgeMm: this.edgeMm };
    let timer: ReturnType<typeof setTimeout> | undefined;
    return new Promise<CusickResponse>((resolve, reject) => {
      timer = setTimeout(
        () => worker.kill('worker timeout', new Error('worker timeout')),
        this.timeoutMs,
      );
      worker.send(request, { resolve, reject });
    }).finally(() => clearTimeout(timer));
  }

  /** Un worker mort pendant l'essai est recréé et l'essai renvoyé (borné par MAX_CUSICK_ATTEMPTS). */
  async execute(fabric: Fabric): Promise<CusickRun> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.send(fabric);
        if (!response.ok) throw new Error(response.message);
        return { ...response.result, outlineMm: response.outlineMm };
      } catch (error) {
        if (!(error instanceof WorkerDiedError) || attempt >= MAX_CUSICK_ATTEMPTS) throw error;
      }
    }
  }
}

interface Job {
  fabric: Fabric;
  resolve: (run: CusickRun) => void;
  reject: (error: Error) => void;
}

/**
 * Adaptateur du port `CusickRunner` : un message par essai, réponse retrouvée par son id. Le worker n'est créé
 * qu'à la première demande. Il traite un essai à la fois : l'adaptateur garde sa file et n'envoie le suivant qu'à
 * la fin du précédent, le délai court à partir de l'envoi. Si le worker plante, il est recréé et l'essai renvoyé
 * une fois ; s'il ne répond plus (délai), il est jugé mort : seul l'essai en cours est rejeté, la file continue
 * sur un worker neuf.
 */
export function createWorkerCusickRunner(
  createWorker: () => CusickWorkerLike,
  { timeoutMs = DEFAULT_CUSICK_TIMEOUT_MS, edgeMm = 7.5 }: WorkerCusickOptions = {},
): CusickRunner {
  const sender = new Sender(createWorker, timeoutMs, edgeMm);
  const queue: Job[] = [];
  let busy = false;

  const pump = (): void => {
    const job = busy ? undefined : queue.shift();
    if (!job) return;
    busy = true;
    sender
      .execute(job.fabric)
      .then(job.resolve, job.reject)
      .finally(() => {
        busy = false;
        pump();
      });
  };

  return {
    run: (fabric) =>
      new Promise<CusickRun>((resolve, reject) => {
        queue.push({ fabric, resolve, reject });
        pump();
      }),
  };
}
