import {
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
  StorageType,
} from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/transport-node';

export interface StreamDeclaration {
  readonly name: string;
  /** Sujets du flux ; ici le `type` des événements (ex. `design.>`). */
  readonly subjects: readonly string[];
}

const isNotFound = (error: unknown): boolean =>
  error instanceof JetStreamApiError &&
  (error.code === JetStreamApiCodes.StreamNotFound ||
    error.apiError().err_code === JetStreamApiCodes.StreamNotFound);

/**
 * Déclare le flux de façon idempotente : le crée (stockage fichier, fenêtre de déduplication par défaut), ou
 * aligne ses sujets s'il existe déjà. Une différence que JetStream refuse de mettre à jour (ex. le type de
 * stockage) fait échouer l'appel : le service ne démarre pas avec un flux inattendu.
 */
export async function ensureStream(
  connection: NatsConnection,
  declaration: StreamDeclaration,
): Promise<void> {
  const jsm = await jetstreamManager(connection);
  const config = {
    name: declaration.name,
    subjects: [...declaration.subjects],
    storage: StorageType.File,
  };
  try {
    await jsm.streams.info(declaration.name);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await jsm.streams.add(config);
    return;
  }
  await jsm.streams.update(declaration.name, config);
}
