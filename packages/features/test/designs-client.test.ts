import { describe, expect, it, vi } from 'vitest';
import { createDesignsClient } from '../src/api/designs-client.js';
import { exportFileName } from '../src/api/file-name.js';
import { cutPattern } from './cut-fixtures.js';

const ID = '01920000-0000-7000-8000-00000000d001';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('client : pièces de coupe', () => {
  it('poste {} et rend le CutPattern', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json(cutPattern));
    const result = await createDesignsClient('/api/designs', fetchFn).cutPattern(ID, 3, {});
    expect(result.isOk() && result.value).toEqual(cutPattern);
    expect(fetchFn).toHaveBeenCalledWith(`/api/designs/v1/designs/${ID}/versions/3/cut-patterns`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
  });

  it('un 422 rend le problème', async () => {
    const problem = { type: '/problems/allowance-on-fold', title: 'x', status: 422 };
    const client = createDesignsClient('/api', async () => json(problem, 422));
    const result = await client.cutPattern(ID, 1, {});
    expect(result.isErr() && result.error).toEqual(problem);
  });

  it('une panne réseau rend /problems/network', async () => {
    const client = createDesignsClient('/api', async () => Promise.reject(new Error('down')));
    const result = await client.cutPattern(ID, 1, {});
    expect(result.isErr() && result.error.type).toBe('/problems/network');
  });
});

const URL_VERSIONS = `/api/designs/v1/designs/${ID}/versions`;
const notFound = { type: '/problems/not-found', title: 'x', status: 404 };
const readInit = { method: 'GET', headers: { accept: 'application/json' }, cache: 'no-store' };

describe('client : versions', () => {
  it('listVersions sans paramètre : première page', async () => {
    const page = { designId: ID, items: [] };
    const fetchFn = vi.fn<typeof fetch>(async () => json(page));
    const result = await createDesignsClient('/api/designs', fetchFn).listVersions(ID);
    expect(result.isOk() && result.value).toEqual(page);
    expect(fetchFn).toHaveBeenCalledWith(URL_VERSIONS, readInit);
  });

  it('listVersions passe limit et curseur (encodé)', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json({ designId: ID, items: [] }));
    await createDesignsClient('/api/designs', fetchFn).listVersions(ID, {
      cursor: 'a/b c',
      limit: 5,
    });
    expect(fetchFn).toHaveBeenCalledWith(`${URL_VERSIONS}?limit=5&cursor=a%2Fb+c`, readInit);
  });

  it('getVersion lit la version, sans cache', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json({ number: 3 }));
    const result = await createDesignsClient('/api/designs', fetchFn).getVersion(ID, 3);
    expect(result.isOk() && result.value).toEqual({ number: 3 });
    expect(fetchFn).toHaveBeenCalledWith(`${URL_VERSIONS}/3`, readInit);
  });

  it('getVersionChanges passe since', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json({ params: [] }));
    await createDesignsClient('/api/designs', fetchFn).getVersionChanges(ID, 4, 2);
    expect(fetchFn).toHaveBeenCalledWith(`${URL_VERSIONS}/4/changes?since=2`, readInit);
  });

  it('un 404 rend le problème RFC 9457 pour chaque lecture', async () => {
    const client = createDesignsClient('/api', async () => json(notFound, 404));
    for (const result of [
      await client.listVersions(ID),
      await client.getVersion(ID, 9),
      await client.getVersionChanges(ID, 9, 1),
    ]) {
      expect(result.isErr() && result.error).toEqual(notFound);
    }
  });

  it('une panne réseau rend /problems/network', async () => {
    const client = createDesignsClient('/api', async () => Promise.reject(new Error('down')));
    const result = await client.getVersion(ID, 1);
    expect(result.isErr() && result.error.type).toBe('/problems/network');
  });
});

describe('client : export', () => {
  it('rend les octets intacts et le nom de Content-Disposition', async () => {
    const bytes = Uint8Array.from([0, 255, 1, 128, 37, 80, 68, 70]);
    const fetchFn = async () =>
      new Response(bytes, {
        headers: { 'content-disposition': 'attachment; filename="straight-skirt-v1.pdf"' },
      });
    const result = await createDesignsClient('/api', fetchFn).exportFile(ID, 1, {
      format: 'pdf-a4-tiled',
    });
    expect(result.isOk() && result.value.fileName).toBe('straight-skirt-v1.pdf');
    const received = result.isOk() ? new Uint8Array(await result.value.blob.arrayBuffer()) : [];
    expect(Array.from(received)).toEqual(Array.from(bytes));
  });

  it('un échec est lu en JSON', async () => {
    const problem = { type: '/problems/export-format-unavailable', title: 'x', status: 422 };
    const client = createDesignsClient('/api', async () => json(problem, 422));
    const result = await client.exportFile(ID, 1, { format: 'svg' });
    expect(result.isErr() && result.error).toEqual(problem);
  });

  it.each([
    'attachment; filename="../x.exe"',
    'attachment; filename="a"b.svg"',
    'attachment; filename="patron.exe"',
    'attachment; filename="Jupe.svg"',
    'inline',
  ])('en-tête hostile %s : nom de repli', (header) => {
    expect(exportFileName(header, 'dxf-aama')).toBe('patron.dxf');
  });

  it('sans en-tête : repli selon le format', () => {
    expect(exportFileName(null, 'svg')).toBe('patron.svg');
    expect(exportFileName(null, 'pdf-a4-tiled')).toBe('patron.pdf');
  });
});

describe('client : drapé', () => {
  const drapeUrl = `/api/designs/v1/designs/${ID}/versions/3/drapes`;
  const drape = { id: 'dr1', status: 'pending', createdAt: '2026-10-03T10:00:00.000Z' };

  it('requestDrape poste la demande et rend le drapé (200 comme 202)', async () => {
    const body = { fabric: { preset: 'linen' as const }, quality: 'draft' as const };
    for (const status of [200, 202]) {
      const fetchFn = vi.fn<typeof fetch>(async () => json(drape, status));
      const result = await createDesignsClient('/api/designs', fetchFn).requestDrape(ID, 3, body);
      expect(result.isOk() && result.value).toEqual(drape);
      expect(fetchFn).toHaveBeenCalledWith(drapeUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
  });

  it('getDrape lit l’état, sans cache', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json(drape));
    const result = await createDesignsClient('/api/designs', fetchFn).getDrape(ID, 3, 'dr1');
    expect(result.isOk() && result.value).toEqual(drape);
    expect(fetchFn).toHaveBeenCalledWith(`${drapeUrl}/dr1`, readInit);
  });

  it('getDrapeModel lit le glb en ArrayBuffer, sans cache', async () => {
    const bytes = Uint8Array.of(1, 2, 3);
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response(bytes, { headers: { 'content-type': 'model/gltf-binary' } }),
    );
    const result = await createDesignsClient('/api/designs', fetchFn).getDrapeModel(ID, 3, 'dr1');
    expect(result.isOk() && [...new Uint8Array(result.value)]).toEqual([1, 2, 3]);
    expect(fetchFn).toHaveBeenCalledWith(`${drapeUrl}/dr1/model`, {
      method: 'GET',
      headers: { accept: 'model/gltf-binary' },
      cache: 'no-store',
    });
  });

  it('un 409 application/problem+json devient un ApiProblem', async () => {
    const problem = { type: '/problems/drape-not-completed', title: 'x', status: 409 };
    const client = createDesignsClient(
      '/api',
      async () =>
        new Response(JSON.stringify(problem), {
          status: 409,
          headers: { 'content-type': 'application/problem+json' },
        }),
    );
    const result = await client.getDrapeModel(ID, 3, 'dr1');
    expect(result.isErr() && result.error).toEqual(problem);
  });
});
