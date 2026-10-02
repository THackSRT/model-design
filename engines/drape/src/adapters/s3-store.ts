import { AwsClient } from 'aws4fetch';

// Stockage d'objets compatible S3 : requêtes signées AWS v4 (`aws4fetch`), adressage par chemin, sans reprise (le
// message NATS est renvoyé par JetStream). Le corps d'une erreur du stockage n'est ni relayé ni journalisé.

export interface S3Options {
  /** Point d'accès sans seau (ex. `http://localhost:8333`) : `<endpoint>/<seau>/<clé>`. */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Délai de toute la requête, corps compris. */
  timeoutMs: number;
}

export interface ObjectStore {
  /** Octets de l'objet, ou `undefined` s'il n'existe pas. Toute autre défaillance lève `S3Error`. */
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
}

export class S3Error extends Error {
  constructor(readonly status?: number) {
    super(
      status === undefined ? 'Stockage S3 injoignable.' : `Stockage S3 : statut ${String(status)}.`,
    );
    this.name = 'S3Error';
  }
}

/** Taille maximale lue : seuls de petits objets (résultat JSON) sont relus. */
export const MAX_READ_BYTES = 1024 * 1024;

export class S3Store implements ObjectStore {
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

  private async request(
    key: string,
    init: RequestInit,
    read: (response: Response) => Promise<Uint8Array | undefined>,
  ): Promise<Uint8Array | undefined> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), this.options.timeoutMs);
    try {
      const response = await this.client.fetch(this.url(key), { ...init, signal: abort.signal });
      return await read(response);
    } catch (error) {
      throw error instanceof S3Error ? error : new S3Error();
    } finally {
      clearTimeout(timer);
    }
  }

  get(key: string): Promise<Uint8Array | undefined> {
    return this.request(key, { method: 'GET' }, async (response) => {
      if (response.status === 404) {
        await response.body?.cancel();
        return undefined;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new S3Error(response.status);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > MAX_READ_BYTES) throw new S3Error();
      return bytes;
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.request(
      key,
      {
        method: 'PUT',
        body: body as RequestInit['body'],
        headers: { 'content-type': contentType },
      },
      async (response) => {
        await response.body?.cancel();
        if (!response.ok) throw new S3Error(response.status);
        return undefined;
      },
    );
  }
}
