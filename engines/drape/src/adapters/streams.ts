import {
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/transport-node';

// Déclaration des flux, identique à celle du service designs (mêmes noms, sujets et configuration) pour que le
// démarrage ne dépende pas de l'ordre. Sujet NATS = `type` de l'événement.

export const DRAPE_JOBS_STREAM = {
  name: 'DRAPE_JOBS',
  subjects: ['drape.requested'],
  retention: RetentionPolicy.Workqueue,
  maxAgeMs: 24 * 60 * 60 * 1000,
} as const;

export const DRAPE_STREAM = {
  name: 'DRAPE',
  subjects: ['drape.completed', 'drape.failed'],
} as const;

/** Consommateur durable du moteur sur `DRAPE_JOBS` (un seul : la file de travail interdit les recouvrements). */
export const DRAPE_CONSUMER = {
  stream: DRAPE_JOBS_STREAM.name,
  durable: 'drape',
  filterSubjects: DRAPE_JOBS_STREAM.subjects,
  /** Le calcul envoie un signal de travail au tiers de ce délai. */
  ackWaitMs: 60_000,
  maxDeliver: 5,
  retryDelayMs: 10_000,
} as const;

interface StreamDeclaration {
  readonly name: string;
  readonly subjects: readonly string[];
  readonly retention?: RetentionPolicy;
  readonly maxAgeMs?: number;
}

const NANOS_PER_MS = 1_000_000;

const isNotFound = (error: unknown): boolean =>
  error instanceof JetStreamApiError &&
  (error.code === JetStreamApiCodes.StreamNotFound ||
    error.apiError().err_code === JetStreamApiCodes.StreamNotFound);

/** Crée le flux, ou aligne ses sujets et son âge maximal s'il existe ; une rétention différente fait échouer. */
export async function ensureStream(
  connection: NatsConnection,
  declaration: StreamDeclaration,
): Promise<void> {
  const jsm = await jetstreamManager(connection);
  const config = {
    name: declaration.name,
    subjects: [...declaration.subjects],
    storage: StorageType.File,
    ...(declaration.retention === undefined ? {} : { retention: declaration.retention }),
    ...(declaration.maxAgeMs === undefined ? {} : { max_age: declaration.maxAgeMs * NANOS_PER_MS }),
  };
  let current: string | undefined;
  try {
    current = (await jsm.streams.info(declaration.name)).config.retention;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await jsm.streams.add(config);
    return;
  }
  if (config.retention !== undefined && current !== config.retention) {
    throw new Error(`Flux ${declaration.name} : rétention existante différente de celle demandée.`);
  }
  await jsm.streams.update(declaration.name, config);
}
