import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpPatterningEngine } from '../../src/adapters/engines/http-patterning-engine.js';
import { PATTERNING_PROBLEM_TYPES } from '../../src/application/ports/patterning-engine.js';
import { aSkirt, aSpec, someMeasurements } from '../builders.js';

interface Reply {
  status: number;
  type: string;
  body: string;
}

const problem = (type: unknown, detail: unknown = 'détail du moteur'): Reply => ({
  status: 422,
  type: 'application/problem+json',
  body: JSON.stringify({ type, title: 't', status: 422, detail }),
});

describe('client du moteur de patronage', () => {
  let server: Server;
  let engine: HttpPatterningEngine;
  let reply: Reply = problem('/problems/neckline-too-deep');

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(reply.status, { 'content-type': reply.type });
      response.end(reply.body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    engine = new HttpPatterningEngine({ baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 500 });
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const draft = async () => {
    const result = await engine.draft(someMeasurements(), aSkirt());
    return result.isErr() ? result.error : undefined;
  };

  it('relaie le type stable du moteur et son détail', async () => {
    reply = problem('/problems/neckline-too-deep', 'Encolure trop profonde.');
    expect(await draft()).toEqual({
      kind: 'patterning-problem',
      type: 'neckline-too-deep',
      detail: 'Encolure trop profonde.',
    });
  });

  // Liste de contracts/openapi/designs.yaml, réponse DraftingProblem.
  it('a la même liste blanche que le contrat designs', () => {
    expect([...PATTERNING_PROBLEM_TYPES]).toEqual([
      'measurement-required',
      'inconsistent-measurements',
      'garment-type-not-supported',
      'skirt-shorter-than-hip-depth',
      'trousers-shorter-than-crotch',
      'trousers-hem-too-narrow',
      'neckline-too-deep',
      'sleeve-shorter-than-cap',
    ]);
  });

  it.each([...PATTERNING_PROBLEM_TYPES])('accepte le type %s', async (type) => {
    reply = problem(`/problems/${type}`);
    expect(await draft()).toMatchObject({ kind: 'patterning-problem', type });
  });

  it('donne un détail fixe quand le détail du moteur n’est pas une chaîne', async () => {
    reply = problem('/problems/neckline-too-deep', { x: 1 });
    const failure = await draft();
    expect(failure).toMatchObject({ kind: 'patterning-problem' });
    expect(JSON.stringify(failure)).not.toContain('"x"');
  });

  it('type inconnu : patron impossible, détail fixé par le service', async () => {
    reply = problem('/problems/curve-tangents-parallel', 'secret');
    const failure = await draft();
    expect(failure?.kind).toBe('pattern-impossible');
    expect(JSON.stringify(failure)).not.toContain('secret');
  });

  it('invalid-request du moteur (désaccord de contrat) : indisponible, rien recopié', async () => {
    reply = problem('/problems/invalid-request', 'secret');
    const failure = await draft();
    expect(failure?.kind).toBe('engine-unavailable');
    expect(JSON.stringify(failure)).not.toContain('secret');
  });

  it('validation du moteur (corps recopiant les valeurs) : indisponible, rien recopié', async () => {
    reply = {
      status: 422,
      type: 'application/json',
      body: JSON.stringify({ detail: [{ input: 712, loc: ['body'] }] }),
    };
    const failure = await draft();
    expect(failure?.kind).toBe('engine-unavailable');
    expect(JSON.stringify(failure)).not.toContain('712');
  });

  it.each([
    ['sans préfixe', 'neckline-too-deep'],
    ['nombre', 42],
    ['absent', undefined],
    ['préfixe seul', '/problems/'],
  ])('type mal formé (%s) : indisponible', async (_name, type) => {
    reply = problem(type);
    expect((await draft())?.kind).toBe('engine-unavailable');
  });

  it('panne du moteur : indisponible', async () => {
    reply = { status: 500, type: 'application/json', body: '{}' };
    expect((await draft())?.kind).toBe('engine-unavailable');
  });

  it('réponse 200 hors contrat : indisponible', async () => {
    reply = { status: 200, type: 'application/json', body: '{"pieces":1}' };
    expect((await draft())?.kind).toBe('engine-unavailable');
  });

  it('rend le patron quand le moteur répond selon le contrat', async () => {
    reply = { status: 200, type: 'application/json', body: JSON.stringify(aSpec()) };
    const result = await engine.draft(someMeasurements(), aSkirt());
    expect(result.isOk()).toBe(true);
  });

  it('moteur injoignable : indisponible', async () => {
    const down = new HttpPatterningEngine({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 500 });
    const result = await down.draft(someMeasurements(), aSkirt());
    expect(result.isErr() && result.error.kind).toBe('engine-unavailable');
  });
});
