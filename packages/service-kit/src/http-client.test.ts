import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requestBytes } from './http-client.js';

const BINARY = Buffer.from([0xff, 0x00, 0x25, 0x50]);
let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/binary') {
      res.writeHead(200, { 'content-type': 'application/pdf' }).end(BINARY);
    } else if (req.url === '/slow') {
      setTimeout(() => res.writeHead(200).end(BINARY), 500);
    } else if (req.url === '/big') {
      res.writeHead(200).end(Buffer.alloc(100, 1));
    } else {
      res.writeHead(422, { 'content-type': 'application/json' }).end('{"type":"x"}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

describe('requestBytes', () => {
  it('rend les octets exacts d une réponse binaire', async () => {
    const result = await requestBytes({ url: `${base}/binary`, method: 'POST', timeoutMs: 1000 });
    if (!result.isOk()) throw new Error('échec inattendu');
    expect(Array.from(result.value.bytes)).toEqual(Array.from(BINARY));
    expect(result.value.contentType).toBe('application/pdf');
    expect(result.value.status).toBe(200);
  });

  it('échoue par délai dépassé', async () => {
    const result = await requestBytes({ url: `${base}/slow`, timeoutMs: 50 });
    expect(result.isErr() && result.error).toEqual({ kind: 'timeout' });
  });

  it('relaie une réponse non 2xx avec le corps JSON', async () => {
    const result = await requestBytes({ url: `${base}/error`, timeoutMs: 1000 });
    expect(result.isErr() && result.error).toEqual({
      kind: 'http-error',
      status: 422,
      body: { type: 'x' },
    });
  });

  it('refuse un corps au-delà de maxBytes', async () => {
    const result = await requestBytes({ url: `${base}/big`, timeoutMs: 1000, maxBytes: 10 });
    expect(result.isErr() && result.error).toEqual({ kind: 'too-large', maxBytes: 10 });
  });
});
