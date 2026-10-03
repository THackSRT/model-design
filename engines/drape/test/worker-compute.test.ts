import { jsonSchemas } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { computeDrape } from '../src/adapters/compute.js';
import { cacheKeyOf } from '../src/node.js';
import { fixture, jobOf } from './drape-helpers.js';
import { errorsOf, type Schema } from './schema-check.js';

// Calcul réel (le corps du fil de drapé), sans NATS ni S3.
describe('computeDrape', () => {
  it('jupe droite : GLB et drape.completed conforme', { timeout: 120_000 }, async () => {
    const job = jobOf(fixture('straight-skirt'));
    const out = await computeDrape(job, cacheKeyOf(job));
    expect(out.kind).toBe('completed');
    if (out.kind !== 'completed') return;
    expect(Buffer.from(out.glb.subarray(0, 4)).toString('latin1')).toBe('glTF');
    expect(out.event.result.sizeBytes).toBe(out.glb.length);
    expect(errorsOf(out.event, jsonSchemas.drapeCompleted as unknown as Schema)).toEqual([]);
  });

  it('placement-missing : drape.failed conforme', async () => {
    const spec = structuredClone(fixture('straight-skirt'));
    delete (spec.panels[1] as { placement?: unknown }).placement;
    const job = jobOf(spec);
    const out = await computeDrape(job, cacheKeyOf(job));
    expect(out.kind).toBe('failed');
    expect(out.event).toMatchObject({
      type: '/problems/drape-placement-missing',
      retryable: false,
    });
    expect(errorsOf(out.event, jsonSchemas.drapeFailed as unknown as Schema)).toEqual([]);
  });

  it('entrée que le moteur ne sait pas traiter : échec interne, pas d’exception', async () => {
    const job = jobOf({ ...fixture('straight-skirt'), panels: null as never });
    const out = await computeDrape(job, 'k'.repeat(64));
    expect(out.event).toMatchObject({ type: '/problems/drape-internal' });
  });
});
