import type { DrapeCompleted, DrapeFailed, DrapeJob } from '@atelier/contracts-ts';
import { vi } from 'vitest';
import type { ComputeResult } from '../src/adapters/compute.js';
import type { HandlerDeps, TaskMessage } from '../src/adapters/handler.js';
import type { Logger } from '../src/adapters/logger.js';
import type { ResultMessage } from '../src/adapters/messages.js';
import type { ObjectStore } from '../src/adapters/s3-store.js';
import type { DrapeRunner } from '../src/adapters/thread-runner.js';
import { modelKeyOf } from '../src/node.js';
import { fixture, jobOf } from './drape-helpers.js';

// Doublures des tests du travailleur : stockage en mémoire, éditeur et calcul instrumentés. Aucun réseau.

export const NOW = new Date('2026-01-02T03:04:05.000Z');

export class FakeStore implements ObjectStore {
  readonly objects = new Map<string, Uint8Array>();
  readonly puts: string[] = [];
  failing = false;

  get(key: string): Promise<Uint8Array | undefined> {
    if (this.failing) return Promise.reject(new Error('panne S3'));
    return Promise.resolve(this.objects.get(key));
  }

  put(key: string, body: Uint8Array): Promise<void> {
    if (this.failing) return Promise.reject(new Error('panne S3'));
    this.puts.push(key);
    this.objects.set(key, body);
    return Promise.resolve();
  }
}

export class FakePublisher {
  readonly messages: ResultMessage[] = [];
  failing = false;

  publish(message: ResultMessage): Promise<void> {
    if (this.failing) return Promise.reject(new Error('panne NATS'));
    this.messages.push(message);
    return Promise.resolve();
  }

  envelopes(): Record<string, unknown>[] {
    return this.messages.map(
      (m) => JSON.parse(new TextDecoder().decode(m.body)) as Record<string, unknown>,
    );
  }
}

export const completedFor = (job: DrapeJob, cacheKey: string): DrapeCompleted => ({
  drapeId: job.drapeId,
  designId: job.designId,
  versionNumber: job.versionNumber,
  organizationId: job.organizationId,
  result: {
    modelKey: modelKeyOf(job.organizationId, cacheKey),
    sizeBytes: 4,
    sha256: 'a'.repeat(64),
    ease: { minMm: 1, medianMm: 20, maxMm: 80, tightAreaMm2: 0 },
    maxStrainPercent: 1,
    fabricEstimated: false,
    engineVersion: '0.5.0',
    vertexCount: 10,
    simulatedSteps: 5,
    converged: true,
  },
});

export class FakeRunner implements DrapeRunner {
  runs = 0;
  /** Si défini, `run` attend ce résultat (calcul « long » piloté par le test). */
  gate: Promise<void> | undefined;
  failing = false;
  problem: DrapeFailed['type'] | undefined;

  async run(job: DrapeJob, cacheKey: string): Promise<ComputeResult> {
    this.runs++;
    await this.gate;
    if (this.failing) throw new Error('fil perdu');
    if (this.problem !== undefined) {
      const { drapeId, designId, versionNumber, organizationId } = job;
      const event: DrapeFailed = {
        drapeId,
        designId,
        versionNumber,
        organizationId,
        type: this.problem,
        retryable: false,
      };
      return { kind: 'failed', event };
    }
    return {
      kind: 'completed',
      glb: new Uint8Array([0x67, 0x6c, 0x54, 0x46]),
      event: completedFor(job, cacheKey),
    };
  }

  terminate(): Promise<void> {
    return Promise.resolve();
  }
}

export const silentLogger = (): Logger & { lines: string[] } => {
  const lines: string[] = [];
  return {
    lines,
    log: (level, event, fields) => {
      lines.push(JSON.stringify({ level, event, ...fields }));
    },
  };
};

export function setup() {
  const store = new FakeStore();
  const publisher = new FakePublisher();
  const runner = new FakeRunner();
  const logger = silentLogger();
  const deps: HandlerDeps = {
    store,
    publisher,
    runner,
    logger,
    now: () => NOW,
    heartbeatMs: 1000,
  };
  return { store, publisher, runner, logger, deps };
}

export const job: DrapeJob = jobOf(fixture('straight-skirt'));

export function taskOf(
  data: unknown,
  over: Record<string, unknown> = {},
): TaskMessage & { workings: number } {
  const envelope = {
    specversion: '1.0',
    id: 'evt-1',
    source: '/services/designs',
    type: 'drape.requested',
    time: NOW.toISOString(),
    datacontenttype: 'application/json',
    data,
    ...over,
  };
  const message = {
    subject: 'drape.requested',
    data: new TextEncoder().encode(JSON.stringify(envelope)),
    workings: 0,
    working: vi.fn(() => {
      message.workings++;
    }),
  };
  return message;
}
