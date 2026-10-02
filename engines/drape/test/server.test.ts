import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '../src/index.js';
import { createHealthServer } from '../src/server.js';

describe('GET /health', () => {
  const server = createHealthServer();
  let base = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rend le nom et la version du moteur', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: 'drape', version: ENGINE_VERSION });
    expect(ENGINE_VERSION).toBe('0.7.0');
  });

  it('rend 404 ailleurs', async () => {
    const res = await fetch(`${base}/inconnu`);
    expect(res.status).toBe(404);
  });
});
