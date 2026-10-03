import { err, ok, type Result } from '@atelier/kernel';
import { AwsClient } from 'aws4fetch';
import type { ObjectStore, StoredObject } from '../../application/ports/object-store.js';

export interface S3Options {
  /** Point d'accès, sans seau (ex. `http://localhost:8333`). Adressage par chemin : `<endpoint>/<seau>/<clé>`. */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Délai pour obtenir les en-têtes de la réponse ; le corps est ensuite lu au fil de l'eau. */
  timeoutMs: number;
}

const unavailable = (): Result<StoredObject, { kind: 'storage-unavailable' }> =>
  err({ kind: 'storage-unavailable' });

/**
 * Lecture d'objets dans un stockage compatible S3 (requêtes signées AWS v4 par `aws4fetch`, sans reprise : la
 * requête attend un utilisateur). Tout échec (réseau, délai, statut, absence de corps) devient
 * `storage-unavailable` : le corps de l'erreur du stockage n'est ni relayé ni journalisé.
 */
export class S3ObjectStore implements ObjectStore {
  private readonly client: AwsClient;

  constructor(private readonly options: S3Options) {
    this.client = new AwsClient({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      region: options.region,
      service: 's3',
      retries: 0,
    });
  }

  private url(key: string): string {
    const path = [this.options.bucket, ...key.split('/')].map(encodeURIComponent).join('/');
    return `${this.options.endpoint.replace(/\/+$/, '')}/${path}`;
  }

  async get(key: string): Promise<Result<StoredObject, { kind: 'storage-unavailable' }>> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), this.options.timeoutMs);
    try {
      const response = await this.client.fetch(this.url(key), { signal: abort.signal });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        return unavailable();
      }
      const length = Number(response.headers.get('content-length'));
      return ok({
        body: response.body,
        ...(Number.isSafeInteger(length) && length > 0 ? { sizeBytes: length } : {}),
      });
    } catch {
      return unavailable();
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Sans configuration S3 : toute lecture échoue proprement (le reste du service fonctionne). */
export const unavailableObjectStore: ObjectStore = { get: async () => unavailable() };
