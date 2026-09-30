import 'reflect-metadata';
import type { Design, DesignVersion } from '@atelier/contracts-ts';
import type { INestApplication } from '@nestjs/common';
import { contractValidator, createLogger } from '@atelier/service-kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { composeApp, configSchema } from '../../src/composition.js';
import { aSkirt, clock, sequentialIds, someMeasurements } from '../builders.js';
import { FakePatterningEngine } from '../doubles/fake-patterning-engine.js';

const isDesign = contractValidator('design');
const isDesignVersion = contractValidator('designVersion');

describe('API HTTP du service designs', () => {
  let app: INestApplication;
  let base: string;
  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    const logger = createLogger({}, () => undefined);
    const overrides = {
      designs: new InMemoryDesignRepository(),
      patterning: new FakePatterningEngine(),
      ids: sequentialIds(),
      clock,
    };
    app = await composeApp(configSchema.parse({}), logger, overrides);
    await app.listen(0);
    base = await app.getUrl();
  });
  afterAll(() => app.close());

  it('crée un modèle puis une version, conformes au contrat', async () => {
    const design = (await (
      await post('/v1/designs', { name: 'Jupe droite', garmentType: 'straight-skirt' })
    ).json()) as Design;
    expect(isDesign(design).isOk()).toBe(true);

    const response = await post(`/v1/designs/${design.id}/versions`, {
      measurements: someMeasurements(),
      garment: aSkirt(),
    });
    expect(response.status).toBe(201);
    const version = (await response.json()) as DesignVersion;
    expect(isDesignVersion(version).isOk()).toBe(true);

    const again = await fetch(`${base}/v1/designs/${design.id}/versions/1`);
    expect(await again.json()).toEqual(version);
  });

  it('refuse une requête hors contrat avec une erreur RFC 9457', async () => {
    const response = await post('/v1/designs', { name: '', garmentType: 'robe' });
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(((await response.json()) as { type: string }).type).toBe('/problems/invalid-request');
  });

  it('répond 404 pour un modèle inconnu ou un identifiant mal formé', async () => {
    expect((await fetch(`${base}/v1/designs/01920000-0000-7000-8000-0000000000ff`)).status).toBe(
      404,
    );
    expect((await fetch(`${base}/v1/designs/pas-un-uuid`)).status).toBe(404);
  });
});
