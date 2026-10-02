import 'reflect-metadata';
import type { Design, Drape } from '@atelier/contracts-ts';
import type { Clock } from '@atelier/kernel';
import { createLogger } from '@atelier/service-kit';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { InMemoryDrapeRepository } from '../../src/adapters/persistence/in-memory/in-memory-drape-repository.js';
import { composeApp, configSchema } from '../../src/composition.js';
import {
  DRAPE_TIMEOUT_MS,
  type DrapeId,
  normalizeRequest,
  requestDrape,
} from '../../src/domain/drape.js';
import {
  aDesign,
  aSkirt,
  aSpec,
  NOW,
  OTHER_ORG,
  sequentialIds,
  someMeasurements,
} from '../builders.js';
import { completedData, modelKeyOf } from '../doubles/drape-events.js';
import { FakeObjectStore } from '../doubles/fake-object-store.js';
import { FakePatterningEngine } from '../doubles/fake-patterning-engine.js';

const OTHER_DESIGN = '01920000-0000-7000-8000-00000000d002';
const GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0xff]);

describe('API HTTP : modèle 3D d’un drapé', () => {
  let app: INestApplication;
  let base: string;
  let designId: string;
  let nowMs = new Date(NOW).getTime();
  const clock: Clock = { now: () => new Date(nowMs) };
  const drapes = new InMemoryDrapeRepository();
  const models = new FakeObjectStore();
  const logs: string[] = [];
  const model = (drapeId: string, id = () => designId) =>
    fetch(`${base}/v1/designs/${id()}/versions/1/drapes/${drapeId}/model`);
  const newDrape = async (fabric: string) => {
    const response = await fetch(`${base}/v1/designs/${designId}/versions/1/drapes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fabric: { preset: fabric } }),
    });
    return (await response.json()) as Drape;
  };
  const complete = (drapeId: string) =>
    drapes.recordOutcome(
      {
        organizationId: ORG_ID,
        designId: designId as never,
        versionNumber: 1,
        drapeId: drapeId as never,
      },
      { kind: 'completed', result: completedData({ drapeId, designId }).result },
      new Date(nowMs),
    );
  const ORG_ID = configSchema.parse({}).DEV_ORGANIZATION_ID as never;

  beforeAll(async () => {
    const designs = new InMemoryDesignRepository();
    await designs.create(aDesign({ id: OTHER_DESIGN as never, organizationId: OTHER_ORG }));
    models.put(modelKeyOf(), GLB);
    app = await composeApp(
      configSchema.parse({}),
      createLogger({}, (line) => logs.push(line)),
      {
        designs,
        drapes,
        models,
        patterning: new FakePatterningEngine(),
        ids: sequentialIds(),
        clock,
      },
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

  it('rend les octets du modèle avec les en-têtes du contrat', async () => {
    const { id } = await newDrape('denim');
    await complete(id);
    const response = await model(id);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('model/gltf-binary');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-length')).toBe(String(GLB.length));
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(GLB);
  });

  it('lit la clé enregistrée à la réception du résultat, jamais une clé du client', async () => {
    const { id } = await newDrape('linen');
    await complete(id);
    models.reads.length = 0;
    await fetch(`${base}/v1/designs/${designId}/versions/1/drapes/${id}/model?key=drapes/x/y.glb`, {
      headers: { 'x-model-key': 'drapes/x/y.glb' },
    });
    expect(models.reads).toEqual([modelKeyOf()]);
  });

  it('répond 409 (RFC 9457) tant que le drapé est en attente, sans lire le stockage', async () => {
    const { id } = await newDrape('bazin');
    models.reads.length = 0;
    const response = await model(id);
    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(((await response.json()) as { type: string }).type).toBe(
      '/problems/drape-not-completed',
    );
    expect(models.reads).toEqual([]);
  });

  it('répond 409 pour un drapé échoué ou expiré', async () => {
    const { id } = await newDrape('cotton-wax');
    nowMs += DRAPE_TIMEOUT_MS;
    expect((await model(id)).status).toBe(409);
    nowMs -= DRAPE_TIMEOUT_MS;
  });

  it('répond 404 pour un drapé inconnu ou d’une autre organisation', async () => {
    const foreignDrape = requestDrape({
      id: '01920000-0000-7000-8000-00000000f001' as DrapeId,
      organizationId: OTHER_ORG,
      version: {
        designId: OTHER_DESIGN as never,
        number: 1,
        createdAt: new Date(NOW),
        measurements: someMeasurements(),
        garment: aSkirt(),
        fingerprint: 'a'.repeat(64),
        spec: aSpec(),
      },
      request: normalizeRequest({ fabric: { preset: 'denim' } }),
      requestFingerprint: 'e'.repeat(64),
      now: new Date(NOW),
    });
    await drapes.saveRequest(foreignDrape, new Date(NOW));
    await drapes.recordOutcome(
      {
        organizationId: OTHER_ORG,
        designId: OTHER_DESIGN as never,
        versionNumber: 1,
        drapeId: foreignDrape.drape.id,
      },
      {
        kind: 'completed',
        result: completedData({ drapeId: foreignDrape.drape.id, designId: OTHER_DESIGN }).result,
      },
      new Date(NOW),
    );
    models.reads.length = 0;
    const foreign = await model(foreignDrape.drape.id, () => OTHER_DESIGN);
    expect(foreign.status).toBe(404);
    expect(((await foreign.json()) as { type: string }).type).toBe('/problems/drape-not-found');
    expect((await model(foreignDrape.drape.id)).status).toBe(404);
    expect((await model('01920000-0000-7000-8000-0000000000ff')).status).toBe(404);
    expect((await model('pas-un-uuid')).status).toBe(404);
    expect(models.reads).toEqual([]);
  });

  it('répond 502 si le stockage est en panne ou l’objet absent, sans relayer son corps', async () => {
    const { id } = await newDrape('jersey');
    await complete(id);
    models.failing = true;
    try {
      const response = await model(id);
      expect(response.status).toBe(502);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(((await response.json()) as { type: string }).type).toBe(
        '/problems/storage-unavailable',
      );
    } finally {
      models.failing = false;
    }
  });

  it('ne journalise aucune mesure', () => {
    for (const key of Object.keys(someMeasurements())) {
      expect(logs.join('\n')).not.toContain(key);
    }
  });
});
