import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpManufacturingEngine } from '../../src/adapters/engines/http-manufacturing-engine.js';
import { configSchema } from '../../src/composition.js';
import { aSpec } from '../builders.js';
import { aCutPattern } from '../doubles/fake-manufacturing-engine.js';

interface Reply {
  status: number;
  type: string;
  body: Buffer | string;
}
let reply: Reply;
let received: { url?: string; body: unknown };
let server: Server;
let engine: HttpManufacturingEngine;

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      received = { url: request.url, body: JSON.parse(Buffer.concat(chunks).toString()) };
      response.writeHead(reply.status, {
        'content-type': reply.type,
        'content-disposition': 'attachment; filename="../../evil"',
      });
      response.end(reply.body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  engine = new HttpManufacturingEngine({ baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 500 });
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const problem = (type: string, status = 422): Reply => ({
  status,
  type: 'application/problem+json',
  body: JSON.stringify({ type, title: 't', status, detail: 'détail du moteur' }),
});

describe('client du moteur de fabrication', () => {
  it('rend les pièces de coupe, avec spec et options envoyées', async () => {
    reply = { status: 200, type: 'application/json', body: JSON.stringify(aCutPattern()) };
    const result = await engine.cutPattern(aSpec(), { sizeLabel: '38' });
    expect(result.isOk() && result.value).toEqual(aCutPattern());
    expect(received.url).toBe('/v1/cut-patterns');
    expect(received.body).toMatchObject({ sizeLabel: '38', spec: { unit: 'mm' } });
  });

  it('rend les octets exacts d’un export', async () => {
    reply = { status: 200, type: 'application/pdf', body: Buffer.from([0xff, 0x00, 0x25]) };
    const result = await engine.exportFile(aSpec(), { format: 'pdf-a4-tiled', reference: 'MOD-1' });
    expect(result.isOk() && Array.from(result.value)).toEqual([0xff, 0x00, 0x25]);
    expect(received.url).toBe('/v1/exports');
    expect(received.body).toMatchObject({
      format: 'pdf-a4-tiled',
      locale: 'fr',
      reference: 'MOD-1',
    });
  });

  it('relaie un type de problème de la liste', async () => {
    reply = problem('/problems/allowance-on-fold');
    const result = await engine.cutPattern(aSpec(), {});
    expect(result.isErr() && result.error).toEqual({
      kind: 'manufacturing-problem',
      type: 'allowance-on-fold',
      detail: 'détail du moteur',
    });
  });

  it('relaie export-format-unavailable à l’export', async () => {
    reply = problem('/problems/export-format-unavailable');
    const result = await engine.exportFile(aSpec(), { format: 'dxf-aama' });
    expect(result.isErr() && result.error).toMatchObject({ type: 'export-format-unavailable' });
  });

  it.each([
    ['type hors liste', problem('/problems/surprise')],
    ['invalid-request du moteur', problem('/problems/invalid-request')],
    [
      'validation FastAPI',
      { status: 422, type: 'application/json', body: '{"detail":[{"loc":[]}]}' },
    ],
    ['panne du moteur', problem('/problems/boom', 500)],
    ['réponse hors contrat', { status: 200, type: 'application/json', body: '{"pieces":1}' }],
  ])('%s : moteur indisponible', async (_name, next) => {
    reply = next;
    const result = await engine.cutPattern(aSpec(), {});
    expect(result.isErr() && result.error.kind).toBe('engine-unavailable');
  });

  it('moteur injoignable : indisponible', async () => {
    const down = new HttpManufacturingEngine({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 500 });
    const result = await down.exportFile(aSpec(), { format: 'svg' });
    expect(result.isErr() && result.error.kind).toBe('engine-unavailable');
  });
});

describe('configuration du moteur de fabrication', () => {
  it('a des valeurs par défaut', () => {
    const config = configSchema.parse({});
    expect(config.MANUFACTURING_URL).toBe('http://localhost:3202');
    expect(config.MANUFACTURING_TIMEOUT_MS).toBe(2000);
  });
});
