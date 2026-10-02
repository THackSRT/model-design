import type { Result } from '@atelier/kernel';

export interface StoredObject {
  /** Octets de l'objet, lus au fil de l'eau (jamais chargés en entier par le service). */
  readonly body: ReadableStream<Uint8Array>;
  readonly sizeBytes?: number;
}

/** Stockage objet privé des modèles 3D (lecture seule pour ce service). */
export interface ObjectStore {
  /** Panne, objet absent ou réponse inattendue : même erreur, sans détail du stockage. */
  get(key: string): Promise<Result<StoredObject, { kind: 'storage-unavailable' }>>;
}
