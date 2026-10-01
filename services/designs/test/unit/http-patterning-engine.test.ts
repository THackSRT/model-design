import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpPatterningEngine } from '../../src/adapters/engines/http-patterning-engine.js';
import { aSkirt, someMeasurements } from '../builders.js';

describe('client du moteur de patronage', () => {
  let server: Server;
  let engine: HttpPatterningEngine;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(422, { 'content-type': 'application/problem+json' });
      response.end(
        JSON.stringify({
          type: '/problems/garment-type-not-supported',
          title: 'Type non pris en charge',
          status: 422,
          detail: 'Le type trousers n’est pas encore tracé.',
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    engine = new HttpPatterningEngine({ baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 2000 });
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('relaie un 422 du moteur en patron impossible, pas en panne', async () => {
    const result = await engine.draft(someMeasurements(), aSkirt());
    expect(result.isErr() && result.error).toEqual({
      kind: 'pattern-impossible',
      detail: 'Le type trousers n’est pas encore tracé.',
    });
  });
});
