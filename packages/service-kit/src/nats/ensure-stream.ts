import {
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/transport-node';

export type StreamRetention = 'limits' | 'workqueue' | 'interest';

export interface StreamDeclaration {
  readonly name: string;
  /** Sujets du flux ; ici le `type` des événements (ex. `design.>`). */
  readonly subjects: readonly string[];
  /**
   * Rétention : `limits` (défaut de JetStream), `workqueue` (file de travail : un message est retiré dès qu'un
   * consommateur l'acquitte ; les consommateurs ne doivent pas se recouvrir) ou `interest`. Absente : pas
   * fixée par l'appel (défaut JetStream à la création). Elle ne peut pas changer sur un flux existant.
   */
  readonly retention?: StreamRetention;
  /** Âge maximal d'un message, en millisecondes (entier positif). Absent : pas de limite fixée par l'appel. */
  readonly maxAgeMs?: number;
}

const RETENTION = {
  limits: RetentionPolicy.Limits,
  workqueue: RetentionPolicy.Workqueue,
  interest: RetentionPolicy.Interest,
} as const;

const NANOS_PER_MS = 1_000_000;

interface StreamConfigInput {
  name: string;
  subjects: string[];
  storage: StorageType;
  retention?: RetentionPolicy;
  max_age?: number;
}

/** Partie du gestionnaire JetStream utilisée ici (remplaçable par une doublure dans les tests). */
export interface StreamsApi {
  info(name: string): Promise<{ config: { retention?: string } }>;
  add(config: StreamConfigInput): Promise<unknown>;
  update(name: string, config: StreamConfigInput): Promise<unknown>;
}

const isNotFound = (error: unknown): boolean =>
  error instanceof JetStreamApiError &&
  (error.code === JetStreamApiCodes.StreamNotFound ||
    error.apiError().err_code === JetStreamApiCodes.StreamNotFound);

function configOf(declaration: StreamDeclaration): StreamConfigInput {
  const { maxAgeMs } = declaration;
  if (maxAgeMs !== undefined && (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0)) {
    throw new RangeError(`Flux ${declaration.name} : maxAgeMs doit être un entier positif.`);
  }
  return {
    name: declaration.name,
    subjects: [...declaration.subjects],
    storage: StorageType.File,
    ...(declaration.retention === undefined ? {} : { retention: RETENTION[declaration.retention] }),
    ...(maxAgeMs === undefined ? {} : { max_age: maxAgeMs * NANOS_PER_MS }),
  };
}

/** Déclare le flux auprès de `streams` : voir `ensureStream`. */
export async function applyStream(
  streams: StreamsApi,
  declaration: StreamDeclaration,
): Promise<void> {
  const config = configOf(declaration);
  let existing: { config: { retention?: string } };
  try {
    existing = await streams.info(declaration.name);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await streams.add(config);
    return;
  }
  const current = existing.config.retention;
  if (config.retention !== undefined && current !== undefined && current !== config.retention) {
    // JetStream refuse de changer la rétention d'un flux : mieux vaut le dire clairement au démarrage.
    throw new Error(
      `Flux ${declaration.name} : rétention ${current} existante, ${config.retention} demandée ; JetStream ne la modifie pas (supprimer et recréer le flux).`,
    );
  }
  await streams.update(declaration.name, config);
}

/**
 * Déclare le flux de façon idempotente : le crée (stockage fichier, fenêtre de déduplication par défaut, plus
 * rétention et âge maximal s'ils sont donnés), ou aligne ses sujets, sa rétention et son âge maximal s'il existe
 * déjà. Une différence que JetStream refuse de mettre à jour (type de stockage, rétention) fait échouer l'appel :
 * le service ne démarre pas avec un flux inattendu.
 */
export async function ensureStream(
  connection: NatsConnection,
  declaration: StreamDeclaration,
): Promise<void> {
  const jsm = await jetstreamManager(connection);
  await applyStream(jsm.streams as unknown as StreamsApi, declaration);
}
