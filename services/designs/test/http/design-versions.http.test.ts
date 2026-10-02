import 'reflect-metadata';
import type { Design, DesignVersionChanges, DesignVersionPage } from '@atelier/contracts-ts';
import { contractValidator, createLogger } from '@atelier/service-kit';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { composeApp, configSchema } from '../../src/composition.js';
import type { DesignId } from '../../src/domain/design.js';
import { aDesign, aSkirt, clock, OTHER_ORG, sequentialIds, someMeasurements } from '../builders.js';
import { FakePatterningEngine } from '../doubles/fake-patterning-engine.js';

const isPage = contractValidator<DesignVersionPage>('designVersionPage');
const isChanges = contractValidator<DesignVersionChanges>('designVersionChanges');
const OTHER_DESIGN = '01920000-0000-7000-8000-00000000d002';
const UNKNOWN_DESIGN = '01920000-0000-7000-8000-0000000000ff';

describe('API HTTP : versions d’un modèle', () => {
  let app: INestApplication;
  let base: string;
  let designId: string;
  let emptyDesignId: string;
  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const list = (query = '', id = designId) => fetch(`${base}/v1/designs/${id}/versions${query}`);
  const changes = (n: number | string, since: string, id = designId) =>
    fetch(`${base}/v1/designs/${id}/versions/${n}/changes?since=${since}`);
  const problemType = async (response: Response) =>
    ((await response.json()) as { type: string }).type;
  const newDesign = async () => {
    const created = await post('/v1/designs', { name: 'Jupe', garmentType: 'straight-skirt' });
    return ((await created.json()) as Design).id;
  };

  beforeAll(async () => {
    const designs = new InMemoryDesignRepository();
    await designs.create(aDesign({ id: OTHER_DESIGN as DesignId, organizationId: OTHER_ORG }));
    app = await composeApp(
      configSchema.parse({}),
      createLogger({}, () => undefined),
      { designs, patterning: new FakePatterningEngine(), ids: sequentialIds(), clock },
    );
    await app.listen(0);
    base = await app.getUrl();
    designId = await newDesign();
    emptyDesignId = await newDesign();
    const bodies = [
      { measurements: someMeasurements(), garment: aSkirt(600) },
      { measurements: { ...someMeasurements(), waistGirthMm: 720 }, garment: aSkirt(650) },
      { measurements: someMeasurements(), garment: aSkirt(600) },
    ];
    for (const body of bodies) {
      expect((await post(`/v1/designs/${designId}/versions`, body)).status).toBe(201);
    }
  });
  afterAll(() => app.close());

  it('pagine du plus récent au plus ancien avec un curseur opaque', async () => {
    const first = await list('?limit=2');
    expect(first.status).toBe(200);
    const page = (await first.json()) as DesignVersionPage;
    expect(isPage(page).isOk()).toBe(true);
    expect(page.items.map((i) => i.number)).toEqual([3, 2]);
    expect(page.nextCursor).toBeTruthy();

    const second = await list(`?limit=2&cursor=${page.nextCursor}`);
    const next = (await second.json()) as DesignVersionPage;
    expect(isPage(next).isOk()).toBe(true);
    expect(next.items.map((i) => i.number)).toEqual([1]);
    expect(next.nextCursor).toBeUndefined();
  });

  it('liste tout par défaut, sans curseur quand tout tient', async () => {
    const page = (await (await list()).json()) as DesignVersionPage;
    expect(page.items.map((i) => i.number)).toEqual([3, 2, 1]);
    expect(page.nextCursor).toBeUndefined();
  });

  it('ne rend ni mesures ni patron dans un résumé', async () => {
    const text = await (await list()).text();
    expect(text).not.toContain('measurements');
    expect(text).not.toContain('"spec"');
    expect(text).not.toContain('waistGirthMm');
  });

  it('modèle sans version : liste vide', async () => {
    const page = (await (await list('', emptyDesignId)).json()) as DesignVersionPage;
    expect(page).toEqual({ designId: emptyDesignId, items: [] });
  });

  it('modèle inconnu ou d’une autre organisation : 404 design-not-found', async () => {
    for (const id of [UNKNOWN_DESIGN, OTHER_DESIGN]) {
      const response = await list('', id);
      expect(response.status).toBe(404);
      expect(await problemType(response)).toBe('/problems/design-not-found');
      expect((await changes(2, '1', id)).status).toBe(404);
    }
  });

  it.each(['?limit=0', '?limit=101', '?limit=abc', '?cursor=abc', '?cursor=0', '?limit=1&limit=2'])(
    'refuse %s en 400',
    async (query) => {
      const response = await list(query);
      expect(response.status).toBe(400);
      expect(await problemType(response)).toBe('/problems/invalid-request');
    },
  );

  it('compare deux versions, sans cache', async () => {
    const response = await changes(2, '1');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as DesignVersionChanges;
    expect(isChanges(body).isOk()).toBe(true);
    expect(body).toMatchObject({
      designId,
      from: { number: 1 },
      to: { number: 2 },
      sameFingerprint: false,
      params: [{ path: 'lengthMm', from: 600, to: 650 }],
      measurements: [{ name: 'waistGirthMm', from: 700, to: 720 }],
    });
  });

  it('versions de mêmes entrées : même empreinte, aucune différence', async () => {
    const same = (await (await changes(3, '1')).json()) as DesignVersionChanges;
    expect(same).toMatchObject({ sameFingerprint: true, params: [], measurements: [] });
    const self = (await (await changes(2, '2')).json()) as DesignVersionChanges;
    expect(self).toMatchObject({ sameFingerprint: true, params: [], measurements: [] });
  });

  it('version inconnue (n ou since) : 404 version-not-found', async () => {
    for (const response of [await changes(9, '1'), await changes(2, '9')]) {
      expect(response.status).toBe(404);
      expect(await problemType(response)).toBe('/problems/version-not-found');
    }
  });

  it.each(['0', 'x', '-1', '1.5'])('since=%s : 400', async (since) => {
    const response = await changes(2, since);
    expect(response.status).toBe(400);
    expect(await problemType(response)).toBe('/problems/invalid-request');
  });

  it('exige since', async () => {
    expect((await fetch(`${base}/v1/designs/${designId}/versions/2/changes`)).status).toBe(400);
  });

  it('la lecture d’une version porte Cache-Control: no-store', async () => {
    const response = await fetch(`${base}/v1/designs/${designId}/versions/1`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
