import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { S3Error, S3Store } from '../src/adapters/s3-store.js';

const KEY = `drapes/00000000-0000-4000-8000-000000000002/${'b'.repeat(64)}.glb`;
const BYTES = Buffer.from([1, 2, 3, 4, 5]);

describe('S3Store (faux serveur S3)', () => {
  const requests: { request: IncomingMessage; body: Buffer }[] = [];
  let behavior: 'ok' | 'missing' | 'error' | 'slow' = 'ok';
  let endpoint = '';
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push({ request, body: Buffer.concat(chunks) });
      if (behavior === 'slow') return;
      if (behavior === 'ok') {
        response.writeHead(request.method === 'PUT' ? 200 : 200, {
          'content-length': BYTES.length,
        });
        response.end(request.method === 'PUT' ? undefined : BYTES);
        return;
      }
      response.writeHead(behavior === 'missing' ? 404 : 500, { 'content-type': 'application/xml' });
      response.end('<Error><Message>secret-internal-detail</Message></Error>');
    });
  });
  const store = (timeoutMs = 2000) =>
    new S3Store({
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

  it('lit un objet par une requête signée AWS v4 en adressage par chemin', async () => {
    behavior = 'ok';
    expect(Buffer.from((await store().get(KEY)) as Uint8Array)).toEqual(BYTES);
    const { request } = requests.at(-1) ?? {};
    expect(request?.method).toBe('GET');
    expect(request?.url).toBe(`/drapes/${KEY}`);
    expect(request?.headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=dev-access\/\d{8}\/us-east-1\/s3\/aws4_request/,
    );
  });

  it('écrit un objet signé, avec son type de contenu et ses octets', async () => {
    behavior = 'ok';
    await store().put(KEY, new Uint8Array(BYTES), 'model/gltf-binary');
    const { request, body } = requests.at(-1) ?? {};
    expect(request?.method).toBe('PUT');
    expect(request?.url).toBe(`/drapes/${KEY}`);
    expect(request?.headers['content-type']).toBe('model/gltf-binary');
    expect(request?.headers.authorization).toContain('AWS4-HMAC-SHA256');
    expect(request?.headers['x-amz-date']).toBeDefined();
    expect(body).toEqual(BYTES);
  });

  it('objet absent : undefined', async () => {
    behavior = 'missing';
    expect(await store().get(KEY)).toBeUndefined();
  });

  it('erreur du stockage : S3Error sans le corps de la réponse', async () => {
    behavior = 'error';
    for (const call of [() => store().get(KEY), () => store().put(KEY, BYTES, 'x/y')]) {
      const error = await call().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(S3Error);
      expect((error as Error).message).not.toContain('secret-internal-detail');
    }
  });

  it('stockage trop lent : S3Error après le délai', async () => {
    behavior = 'slow';
    await expect(store(150).get(KEY)).rejects.toBeInstanceOf(S3Error);
  });

  it('stockage injoignable : S3Error', async () => {
    const dead = new S3Store({
      endpoint: 'http://127.0.0.1:1',
      region: 'us-east-1',
      bucket: 'drapes',
      accessKeyId: 'a',
      secretAccessKey: 'b',
      timeoutMs: 500,
    });
    await expect(dead.get(KEY)).rejects.toBeInstanceOf(S3Error);
  });
});
