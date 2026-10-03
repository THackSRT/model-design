import type { DrapeCompleted, DrapeFailed, DrapeJob, DrapeResult } from '@atelier/contracts-ts';
import { cacheKeyOf, modelKeyOf } from '../node.js';
import { errorName, type Logger } from './logger.js';
import {
  completedMessage,
  failedMessage,
  internalFailure,
  parseTask,
  type ResultMessage,
} from './messages.js';
import type { ObjectStore } from './s3-store.js';
import type { DrapeRunner } from './thread-runner.js';

// Traitement d'une tâche `drape.requested` (ADR 0013). Résolu : le message est acquitté. Rejeté (S3 ou NATS en
// panne, fil de calcul perdu) : il est renvoyé plus tard par le consommateur. Aucune mesure ni contenu de tâche dans
// les journaux ou les erreurs.

export interface TaskMessage {
  subject: string;
  data: Uint8Array;
  /** Signal de travail : repousse l'`ack_wait` pendant un calcul long. */
  working(): void;
}

export interface ResultPublisher {
  publish(message: ResultMessage): Promise<void>;
}

export interface HandlerDeps {
  store: ObjectStore;
  publisher: ResultPublisher;
  runner: DrapeRunner;
  logger: Logger;
  now: () => Date;
  /** Intervalle des signaux de travail, ms (le tiers de l'`ack_wait`). */
  heartbeatMs: number;
}

/**
 * Résultat à côté du modèle : `drapes/<organisation>/<clé>.json`, le `DrapeResult` complet (indicateurs d'aisance,
 * taille, empreinte ; aucune mesure). Il est écrit après le GLB et marque le calcul terminé : s'il existe, le GLB
 * existe, et le résultat est republié sans simulation.
 */
export const resultKeyOf = (organizationId: string, cacheKey: string): string =>
  modelKeyOf(organizationId, cacheKey).replace(/[.]glb$/, '.json');

function isStoredResult(value: unknown, modelKey: string): value is DrapeResult {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record['modelKey'] === modelKey &&
    typeof record['sha256'] === 'string' &&
    typeof record['sizeBytes'] === 'number' &&
    typeof record['engineVersion'] === 'string'
  );
}

async function cachedResult(
  store: ObjectStore,
  organizationId: string,
  cacheKey: string,
): Promise<DrapeResult | undefined> {
  const bytes = await store.get(resultKeyOf(organizationId, cacheKey));
  if (bytes === undefined) return undefined;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return isStoredResult(value, modelKeyOf(organizationId, cacheKey)) ? value : undefined;
  } catch {
    return undefined;
  }
}

function cacheKeyOrUndefined(job: DrapeJob): string | undefined {
  try {
    return cacheKeyOf(job);
  } catch {
    return undefined;
  }
}

async function compute(
  deps: HandlerDeps,
  job: DrapeJob,
  cacheKey: string,
): Promise<DrapeCompleted | DrapeFailed> {
  const cached = await cachedResult(deps.store, job.organizationId, cacheKey);
  if (cached !== undefined) {
    const { drapeId, designId, versionNumber, organizationId } = job;
    return { drapeId, designId, versionNumber, organizationId, result: cached };
  }
  const computed = await deps.runner.run(job, cacheKey);
  if (computed.kind === 'failed') return computed.event;
  const modelKey = modelKeyOf(job.organizationId, cacheKey);
  await deps.store.put(modelKey, computed.glb, 'model/gltf-binary');
  const json = new TextEncoder().encode(JSON.stringify(computed.event.result));
  await deps.store.put(resultKeyOf(job.organizationId, cacheKey), json, 'application/json');
  return computed.event;
}

const isCompleted = (event: DrapeCompleted | DrapeFailed): event is DrapeCompleted =>
  'result' in event;

async function handleJob(deps: HandlerDeps, job: DrapeJob): Promise<void> {
  const cacheKey = cacheKeyOrUndefined(job);
  const event = cacheKey === undefined ? internalFailure(job) : await compute(deps, job, cacheKey);
  const message = isCompleted(event)
    ? completedMessage(event, deps.now())
    : failedMessage(event, deps.now());
  await deps.publisher.publish(message);
  deps.logger.log('info', isCompleted(event) ? 'drape.completed' : 'drape.failed', {
    drapeId: job.drapeId,
  });
}

async function rejectInvalid(
  deps: HandlerDeps,
  subject: string,
  task: Extract<ReturnType<typeof parseTask>, { kind: 'invalid' }>,
): Promise<void> {
  deps.logger.log('warn', 'task.invalid', { subject, eventId: task.eventId });
  if (task.ids === undefined) return;
  await deps.publisher.publish(failedMessage(internalFailure(task.ids), deps.now()));
}

/** Gestionnaire d'un message de la file `DRAPE_JOBS`. */
export function createTaskHandler(deps: HandlerDeps): (message: TaskMessage) => Promise<void> {
  return async (message) => {
    const task = parseTask(message.data);
    if (task.kind === 'invalid') return rejectInvalid(deps, message.subject, task);
    const timer = setInterval(() => {
      try {
        message.working();
      } catch (error) {
        deps.logger.log('warn', 'task.working-failed', { errorName: errorName(error) });
      }
    }, deps.heartbeatMs);
    try {
      await handleJob(deps, task.job);
    } finally {
      clearInterval(timer);
    }
  };
}
