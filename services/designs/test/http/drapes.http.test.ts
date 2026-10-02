import 'reflect-metadata';
import type { Design, Drape, DrapeRequested } from '@atelier/contracts-ts';
import type { Clock } from '@atelier/kernel';
import { contractValidator, createLogger } from '@atelier/service-kit';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { InMemoryDrapeRepository } from '../../src/adapters/persistence/in-memory/in-memory-drape-repository.js';
import { composeApp, configSchema } from '../../src/composition.js';
import { DRAPE_TIMEOUT_MS } from '../../src/domain/drape.js';
import { aDesign, aSkirt, NOW, OTHER_ORG, sequentialIds, someMeasurements } from '../builders.js';
import { FakePatterningEngine } from '../doubles/fake-patterning-engine.js';

const isDrape = contractValidator<Drape>('drape');
const isJob = contractValidator<DrapeRequested>('drapeRequested');
const OTHER_DESIGN = '01920000-0000-7000-8000-00000000d002';
const UNKNOWN_DESIGN = '01920000-0000-7000-8000-0000000000ff';
const body = { fabric: { preset: 'denim' }, quality: 'draft' };

describe('API HTTP : drapés d’une version', () => {
  let app: INestApplication;
  let base: string;
  let designId: string;
  let nowMs = new Date(NOW).getTime();
  const clock: Clock = { now: () => new Date(nowMs) };
  const drapes = new InMemoryDrapeRepository();
  const logs: string[] = [];
  const post = (payload: unknown, id = () => designId, version = 1) =>
    fetch(`${base}/v1/designs/${id()}/versions/${version}/drapes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  const read = (drapeId: string, id = designId, version = 1) =>
    fetch(`${base}/v1/designs/${id}/versions/${version}/drapes/${drapeId}`);

  beforeAll(async () => {
    const designs = new InMemoryDesignRepository();
    await designs.create(aDesign({ id: OTHER_DESIGN as never, organizationId: OTHER_ORG }));
    app = await composeApp(
      configSchema.parse({}),
      createLogger({}, (line) => logs.push(line)),
      { designs, drapes, patterning: new FakePatterningEngine(), ids: sequentialIds(), clock },
    );
    await app.listen(0);
    base = await app.getUrl();
    const created = await fetch(`${base}/v1/designs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Jupe', garmentType: 'straight-skirt' }),
    });
    designId = ((await created.json()) as Design).id;
    const version = await fetch(`${base}/v1/designs/${designId}/versions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ measurements: someMeasurements(), garment: aSkirt() }),
    });
    expect(version.status).toBe(201);
  });
  afterAll(() => app.close());

  it('crée un drapé en attente (202) et publie un événement conforme au contrat', async () => {
    const response = await post(body);
    expect(response.status).toBe(202);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const drape = (await response.json()) as Drape;
    expect(isDrape(drape).isOk()).toBe(true);
    expect(drape.status).toBe('pending');
    expect(response.headers.get('location')).toBe(
      `/v1/designs/${designId}/versions/1/drapes/${drape.id}`,
    );
    expect(drapes.outbox).toHaveLength(1);
    const event = drapes.outbox[0];
    expect(event?.type).toBe('drape.requested');
    expect(isJob(event?.data).isOk()).toBe(true);
    expect(event?.data).toMatchObject({ drapeId: drape.id, quality: 'draft', avatar: {} });
  });

  it('rend le même drapé (200) pour la même demande, sans second événement', async () => {
    const first = (await (await post(body)).json()) as Drape;
    const again = await post({ quality: 'draft', fabric: { preset: 'denim' } });
    expect(again.status).toBe(200);
    expect(((await again.json()) as Drape).id).toBe(first.id);
    expect(drapes.outbox).toHaveLength(1);
  });

  it('lit le drapé en attente, puis échoué avec drape-timeout après 10 minutes', async () => {
    const { id } = (await (await post(body)).json()) as Drape;
    const pending = await read(id);
    expect(pending.status).toBe(200);
    expect(pending.headers.get('cache-control')).toBe('no-store');
    expect(((await pending.json()) as Drape).status).toBe('pending');
    nowMs += DRAPE_TIMEOUT_MS;
    const late = (await (await read(id)).json()) as Drape;
    expect(isDrape(late).isOk()).toBe(true);
    expect(late).toMatchObject({ status: 'failed', problemType: '/problems/drape-timeout' });
  });

  it('ne rend jamais de mesure dans une réponse ni dans les journaux', async () => {
    const response = await post({ fabric: { preset: 'linen' } });
    const text = await response.text();
    const { id } = JSON.parse(text) as Drape;
    const readBack = await (await read(id)).text();
    for (const key of Object.keys(someMeasurements())) {
      expect(text).not.toContain(key);
      expect(readBack).not.toContain(key);
      expect(logs.join('\n')).not.toContain(key);
    }
  });

  it('répond 404 pour une version ou un modèle inconnu, ou d’une autre organisation', async () => {
    expect((await post(body, () => designId, 9)).status).toBe(404);
    expect((await post(body, () => UNKNOWN_DESIGN)).status).toBe(404);
    const foreign = await post(body, () => OTHER_DESIGN);
    expect(foreign.status).toBe(404);
    expect(((await foreign.json()) as { type: string }).type).toBe('/problems/design-not-found');
  });

  it('répond 404 pour le drapé inconnu ou lu par la mauvaise version', async () => {
    const { id } = (await (await post({ fabric: { preset: 'jersey' } })).json()) as Drape;
    expect((await read(UNKNOWN_DESIGN)).status).toBe(404);
    expect((await read(id, designId, 2)).status).toBe(404);
    expect((await read(id, OTHER_DESIGN)).status).toBe(404);
    const missing = await read('pas-un-uuid');
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { type: string }).type).toBe('/problems/drape-not-found');
  });

  it('refuse une requête hors contrat (400, RFC 9457)', async () => {
    for (const payload of [{}, { fabric: { preset: 'inconnu' } }, { ...body, extra: 1 }]) {
      const response = await post(payload);
      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(((await response.json()) as { type: string }).type).toBe('/problems/invalid-request');
    }
  });
});
