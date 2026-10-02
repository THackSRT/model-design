import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { S3ObjectStore } from '../../src/adapters/storage/s3-object-store.js';

const KEY = `drapes/01920000-0000-7000-8000-000000000001/${'b'.repeat(64)}.glb`;
const BYTES = Buffer.from([1, 2, 3, 4, 5]);

describe('S3ObjectStore (faux serveur S3)', () => {
  const requests: IncomingMessage[] = [];
  let behavior: 'ok' | 'missing' | 'error' | 'slow' = 'ok';
  let endpoint = '';
  const server = createServer((request, response) => {
    requests.push(request);
    if (behavior === 'slow') return;
    if (behavior === 'ok') {
      response.writeHead(200, {
        'content-type': 'binary/octet-stream',
        'content-length': BYTES.length,
      });
      response.end(BYTES);
      return;
    }
    const status = behavior === 'missing' ? 404 : 500;
    response.writeHead(status, { 'content-type': 'application/xml' });
    response.end('<Error><Message>secret-internal-detail</Message></Error>');
  });
  const store = (timeoutMs = 2000) =>
    new S3ObjectStore({
      endpoint,
      region: 'us-east-1',
      bucket: 'drapes',
      accessKeyId: 'dev-access',
      secretAccessKey: 'dev-secret',
      timeoutMs,
    });

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    endpoint = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  });
  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  it('lit l’objet en flux, par une requête signée AWS v4 en adressage par chemin', async () => {
    behavior = 'ok';
    const result = await store().get(KEY);
    if (result.isErr()) throw new Error('lecture refusée');
    expect(result.value.sizeBytes).toBe(BYTES.length);
    expect(Buffer.from(await new Response(result.value.body).arrayBuffer())).toEqual(BYTES);
    const request = requests.at(-1);
    expect(request?.method).toBe('GET');
    expect(request?.url).toBe(`/drapes/${KEY}`);
    expect(request?.headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=dev-access\/\d{8}\/us-east-1\/s3\/aws4_request/,
    );
  });

  it.each([['missing'], ['error']] as const)(
    'objet absent ou erreur (%s) : storage-unavailable',
    async (mode) => {
      behavior = mode;
      const result = await store().get(KEY);
      expect(result.isErr() && result.error).toEqual({ kind: 'storage-unavailable' });
    },
  );

  it('stockage injoignable ou trop lent : storage-unavailable', async () => {
    behavior = 'slow';
    const slow = await store(100).get(KEY);
    expect(slow.isErr() && slow.error).toEqual({ kind: 'storage-unavailable' });
    const unreachable = await new S3ObjectStore({
      endpoint: 'http://127.0.0.1:1',
      region: 'us-east-1',
      bucket: 'drapes',
      accessKeyId: 'a',
      secretAccessKey: 'b',
      timeoutMs: 500,
    }).get(KEY);
    expect(unreachable.isErr()).toBe(true);
  });
});
