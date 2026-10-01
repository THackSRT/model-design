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
