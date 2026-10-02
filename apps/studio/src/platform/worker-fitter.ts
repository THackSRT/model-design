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
  /** Vrai quand un ajustement a réussi dans ce worker : il garde le corps à habiller. */
  fitted = false;
  /** Rejeu du dernier ajustement en cours (partagé par les habillages simultanés). */
  replay: Promise<void> | undefined;

  constructor(createWorker: () => WorkerLike) {
    this.worker = createWorker();
    this.worker.addEventListener('message', (event) => {
      const entry = this.waiting.get(event.data.id);
      this.waiting.delete(event.data.id);
      if (entry && event.data.ok && 'mannequin' in event.data) this.fitted = true;
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

  kill(reason: string, error: Error = new WorkerDiedError(reason)): void {
    if (!this.alive) return;
    this.alive = false;
    this.worker.terminate();
    for (const entry of this.waiting.values()) entry.reject(error);
    this.waiting.clear();
  }
}

/** Le worker a planté ou s'est terminé : la demande peut être renvoyée à un worker neuf. */
class WorkerDiedError extends Error {}

/** Nombre maximal d'envois d'une demande (le premier + les relances après la mort du worker). */
export const MAX_WORKER_ATTEMPTS = 2;

type Build = (id: number) => WorkerRequest;

/** Envoie les demandes au worker courant, le recrée s'il est mort, relance si besoin. */
class WorkerCaller {
  private session: WorkerSession | undefined;
  private nextId = 0;
  lastFit: Build | undefined;

  constructor(
    private readonly createWorker: () => WorkerLike,
    private readonly timeoutMs: number,
  ) {}

  private current(): WorkerSession {
    if (!this.session?.isAlive) this.session = new WorkerSession(this.createWorker);
    return this.session;
  }

  /** Redonne au worker courant le corps du dernier ajustement s'il ne l'a pas (une seule fois). */
  private bodyReplay(): Promise<void> | undefined {
    const session = this.current();
    const last = this.lastFit;
    if (session.fitted || !last) return undefined;
    session.replay ??= this.send(last)
      .then((response) => {
        if (!response.ok) throw new Error(response.message);
      })
      .finally(() => {
        session.replay = undefined;
      });
    return session.replay;
  }

  private async send(build: Build): Promise<WorkerResponse> {
    const current = this.current();
    this.nextId += 1;
    const request = build(this.nextId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    return new Promise<WorkerResponse>((resolve, reject) => {
      timer = setTimeout(
        () => current.kill('worker timeout', new Error('worker timeout')),
        this.timeoutMs,
      );
      current.send(request, { resolve, reject });
    }).finally(() => clearTimeout(timer));
  }

  /**
   * Un worker mort pendant la demande est recréé et la demande renvoyée (bornée par MAX_WORKER_ATTEMPTS).
   * Un worker neuf n'a plus le corps : pour un habillage, le dernier ajustement est rejoué d'abord.
   */
  async call(build: Build, replayFit = false): Promise<WorkerResponse> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        // Sans attente inutile : le worker peut mourir entre une vérification et l'envoi.
        for (let pending = replayFit && this.bodyReplay(); pending;)
          pending = (await pending, replayFit && this.bodyReplay());
        const response = await this.send(build);
        if (!response.ok) throw new Error(response.message);
        return response;
      } catch (error) {
        if (!(error instanceof WorkerDiedError) || attempt >= MAX_WORKER_ATTEMPTS) throw error;
      }
    }
  }
}

/**
 * Adaptateur du port `MannequinFitter` : un message par demande, réponse retrouvée par son id.
 * Un worker qui plante ou renvoie un message illisible est recréé et la demande renvoyée une fois ;
 * un worker qui ne répond plus (délai) est jugé mort : la demande est rejetée, le suivant est neuf.
 */
export function createWorkerFitter(
  createWorker: () => WorkerLike,
  { timeoutMs = DEFAULT_FIT_TIMEOUT_MS }: WorkerFitterOptions = {},
): MannequinFitter {
  const caller = new WorkerCaller(createWorker, timeoutMs);
  return {
    async fit(measurements, options) {
      caller.lastFit = (id) => ({ id, measurements, options });
      const response = await caller.call(caller.lastFit);
      if (!('mannequin' in response)) throw new Error('unexpected worker response');
      return response.mannequin;
    },
    async dress(spec, garmentType, options) {
      const response = await caller.call(
        (id) => ({ kind: 'dress', id, spec, garment: { type: garmentType }, options }),
        true,
      );
      if (!('garment' in response)) throw new Error('unexpected worker response');
      return response.garment;
    },
  };
}
