import 'reflect-metadata';
import type { CutPattern, Design } from '@atelier/contracts-ts';
import { contractValidator, createLogger } from '@atelier/service-kit';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpManufacturingEngine } from '../../src/adapters/engines/http-manufacturing-engine.js';
import { InMemoryDesignRepository } from '../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import type { ManufacturingEngine } from '../../src/application/ports/manufacturing-engine.js';
import { composeApp, configSchema } from '../../src/composition.js';
import type { DesignId } from '../../src/domain/design.js';
import { aDesign, aSkirt, clock, OTHER_ORG, sequentialIds, someMeasurements } from '../builders.js';
import {
  aCutPattern,
  FAKE_FILE_BYTES,
  FakeManufacturingEngine,
} from '../doubles/fake-manufacturing-engine.js';
import { FakePatterningEngine } from '../doubles/fake-patterning-engine.js';
import {
  startFakeManufacturingServer,
  type FakeServer,
} from '../doubles/fake-manufacturing-server.js';

const isCutPattern = contractValidator<CutPattern>('cutPattern');

/** Délègue au moteur courant : chaque test choisit le sien sans relancer l'application. */
class SwitchableEngine implements ManufacturingEngine {
  current: ManufacturingEngine = new FakeManufacturingEngine();
  cutPattern: ManufacturingEngine['cutPattern'] = (s, o) => this.current.cutPattern(s, o);
  exportFile: ManufacturingEngine['exportFile'] = (s, r) => this.current.exportFile(s, r);
}

describe('API HTTP : pièces de coupe et exports', () => {
  let app: INestApplication;
  let base: string;
  let designId: string;
  let otherOrgDesignId: string;
  let fake: FakeManufacturingEngine;
  const engine = new SwitchableEngine();
  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const cut = (body: unknown = {}, id = designId, n = 1) =>
    post(`/v1/designs/${id}/versions/${n}/cut-patterns`, body);
  const exportOf = (body: unknown, id = designId, n = 1) =>
    post(`/v1/designs/${id}/versions/${n}/exports`, body);
  const problemType = async (response: Response) =>
    ((await response.json()) as { type: string }).type;
  const use = (next: ManufacturingEngine) => {
    engine.current = next;
  };

  beforeAll(async () => {
    const designs = new InMemoryDesignRepository();
    await designs.create(
      aDesign({
        id: '01920000-0000-7000-8000-00000000d002' as DesignId,
        organizationId: OTHER_ORG,
      }),
    );
    otherOrgDesignId = '01920000-0000-7000-8000-00000000d002';
    app = await composeApp(
      configSchema.parse({}),
      createLogger({}, () => undefined),
      {
        designs,
        patterning: new FakePatterningEngine(),
        manufacturing: engine,
        ids: sequentialIds(),
        clock,
      },
    );
    await app.listen(0);
    base = await app.getUrl();
    const design = (await (
      await post('/v1/designs', { name: 'Jupe <script>', garmentType: 'straight-skirt' })
    ).json()) as Design;
    designId = design.id;
    await post(`/v1/designs/${designId}/versions`, {
      measurements: someMeasurements(),
      garment: aSkirt(),
    });
  });
  afterAll(() => app.close());

  it('rend les pièces de coupe de la version, no-store, avec spec et options transmises', async () => {
    fake = new FakeManufacturingEngine();
    use(fake);
    const response = await cut({ sizeLabel: '38' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(isCutPattern(await response.json()).isOk()).toBe(true);
    expect(fake.cutCalls[0]?.spec.garment.type).toBe('straight-skirt');
    expect(fake.cutCalls[0]?.options).toEqual({ sizeLabel: '38' });
  });

  it('accepte un corps vide {} et refuse un corps hors contrat', async () => {
    use(new FakeManufacturingEngine());
    expect((await cut({})).status).toBe(200);
    const bad = await cut({ finishing: { seamAllowances: { defaultMm: 500 } } });
    expect(bad.status).toBe(400);
    expect(await problemType(bad)).toBe('/problems/invalid-request');
    expect((await exportOf({ format: 'png' })).status).toBe(400);
  });

  it.each([
    ['version absente', () => [designId, 2] as const],
    ['version non numérique', () => [designId, 'abc'] as const],
    ['modèle absent', () => ['01920000-0000-7000-8000-0000000000ff', 1] as const],
    ['autre organisation', () => [otherOrgDesignId, 1] as const],
  ])('%s : 404 sans appeler le moteur', async (_name, ids) => {
    fake = new FakeManufacturingEngine();
    use(fake);
    const [id, n] = ids();
    expect((await cut({}, id, n as number)).status).toBe(404);
    expect((await exportOf({ format: 'svg' }, id, n as number)).status).toBe(404);
    expect(fake.cutCalls).toHaveLength(0);
    expect(fake.exportCalls).toHaveLength(0);
  });

  it.each([
    ['svg', 'image/svg+xml', undefined, 'straight-skirt-v1.svg'],
    ['pdf-a4-tiled', 'application/pdf', '38', 'straight-skirt-v1-38.pdf'],
    ['dxf-aama', 'image/vnd.dxf', 'M/L 2', 'straight-skirt-v1-m-l-2.dxf'],
  ])('exporte en %s : octets, en-têtes et nom contrôlés', async (format, type, sizeLabel, name) => {
    use(new FakeManufacturingEngine());
    const response = await exportOf({ format, ...(sizeLabel ? { sizeLabel } : {}) });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(type);
    expect(response.headers.get('content-disposition')).toBe(`attachment; filename="${name}"`);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(
      Array.from(FAKE_FILE_BYTES),
    );
  });

  it('relaie un type de problème du moteur en 422, détail compris', async () => {
    use(
      new FakeManufacturingEngine({
        kind: 'manufacturing-problem',
        type: 'allowance-on-fold',
        detail: 'Pas de valeur de couture sur la pliure.',
      }),
    );
    const response = await cut();
    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({
      type: '/problems/allowance-on-fold',
      detail: 'Pas de valeur de couture sur la pliure.',
    });
    use(
      new FakeManufacturingEngine({
        kind: 'manufacturing-problem',
        type: 'export-format-unavailable',
        detail: 'x',
      }),
    );
    const exported = await exportOf({ format: 'dxf-aama' });
    expect(exported.status).toBe(422);
    expect(await problemType(exported)).toBe('/problems/export-format-unavailable');
  });

  it('moteur indisponible : 502 engine-unavailable', async () => {
    use(new FakeManufacturingEngine({ kind: 'engine-unavailable', detail: 'x' }));
    const response = await cut();
    expect(response.status).toBe(502);
    expect(await problemType(response)).toBe('/problems/engine-unavailable');
  });

  describe('avec le vrai client HTTP et un faux serveur', () => {
    let server: FakeServer;
    beforeAll(async () => {
      server = await startFakeManufacturingServer();
      use(new HttpManufacturingEngine({ baseUrl: server.url, timeoutMs: 300 }));
    });
    afterAll(() => server.close());

    it('recopie ni nom de fichier ni type de contenu du moteur', async () => {
      server.reply = { status: 200, type: 'text/html', body: Buffer.from(FAKE_FILE_BYTES) };
      const response = await exportOf({ format: 'pdf-a4-tiled', sizeLabel: '38' });
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="straight-skirt-v1-38.pdf"',
      );
    });

    it('relaie un 422 de la liste, et traduit en 502 le reste', async () => {
      const problem = (type?: string) => ({
        status: 422,
        type: 'application/problem+json',
        body: JSON.stringify(
          type ? { type, title: 't', status: 422, detail: 'd' } : { detail: [] },
        ),
      });
      server.reply = problem('/problems/allowance-on-fold');
      expect(await problemType(await cut())).toBe('/problems/allowance-on-fold');
      server.reply = problem('/problems/inconnu');
      expect(await problemType(await cut())).toBe('/problems/engine-unavailable');
      server.reply = problem();
      expect((await cut()).status).toBe(502);
    });

    it('moteur trop lent ou réponse hors contrat : 502', async () => {
      server.reply = { status: 200, type: 'application/json', body: '{}', delayMs: 800 };
      expect((await cut()).status).toBe(502);
      server.reply = { status: 200, type: 'application/json', body: '{"pieces":[]}' };
      expect((await cut()).status).toBe(502);
      server.reply = {
        status: 200,
        type: 'application/json',
        body: JSON.stringify(aCutPattern()),
      };
      expect((await cut()).status).toBe(200);
    });
  });
});
