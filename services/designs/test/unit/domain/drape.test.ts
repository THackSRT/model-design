import { describe, expect, it } from 'vitest';
import {
  DRAPE_TIMEOUT_MS,
  type Drape,
  type DrapeId,
  type DrapeOutcome,
  isReusable,
  normalizeRequest,
  readAt,
  requestCanonical,
  requestDrape,
  settle,
} from '../../../src/domain/drape.js';
import type { DesignVersion } from '../../../src/domain/design-version.js';
import { aDesign, aSkirt, aSpec, NOW, ORG, someMeasurements } from '../../builders.js';

const version: DesignVersion = {
  designId: aDesign().id,
  number: 2,
  createdAt: new Date(NOW),
  measurements: someMeasurements(),
  garment: aSkirt(),
  fingerprint: 'a'.repeat(64),
  spec: aSpec(),
};

const pending = (): Drape =>
  requestDrape({
    id: '01920000-0000-7000-8000-00000000dd01' as DrapeId,
    organizationId: ORG,
    version,
    request: normalizeRequest({ fabric: { preset: 'linen' } }),
    requestFingerprint: 'b'.repeat(64),
    now: new Date(NOW),
  }).drape;

describe('drapé', () => {
  it('applique les défauts du contrat avant l’empreinte : avatar absent = {}, finesse standard', () => {
    const implicit = normalizeRequest({ fabric: { preset: 'linen' } });
    const explicit = normalizeRequest({
      fabric: { preset: 'linen' },
      avatar: {},
      quality: 'standard',
    });
    expect(requestCanonical(implicit)).toBe(requestCanonical(explicit));
  });

  it('crée un drapé en attente et l’événement drape.requested avec la tâche du moteur', () => {
    const { drape, events } = requestDrape({
      id: '01920000-0000-7000-8000-00000000dd01' as DrapeId,
      organizationId: ORG,
      version,
      request: normalizeRequest({ fabric: { preset: 'linen' }, quality: 'draft' }),
      requestFingerprint: 'b'.repeat(64),
      now: new Date(NOW),
    });
    expect(drape).toMatchObject({
      status: 'pending',
      versionNumber: 2,
      designId: version.designId,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'drape.requested', subject: drape.id });
    expect(events[0]?.data).toEqual({
      drapeId: drape.id,
      organizationId: ORG,
      designId: version.designId,
      versionNumber: 2,
      spec: version.spec,
      measurements: version.measurements,
      avatar: {},
      fabric: { preset: 'linen' },
      quality: 'draft',
    });
  });

  it('se lit échoué (drape-timeout) après 10 minutes en attente, sans rien modifier', () => {
    const drape = pending();
    const before = new Date(new Date(NOW).getTime() + DRAPE_TIMEOUT_MS - 1);
    const after = new Date(new Date(NOW).getTime() + DRAPE_TIMEOUT_MS);
    expect(readAt(drape, before).status).toBe('pending');
    expect(readAt(drape, after)).toMatchObject({
      status: 'failed',
      problemType: '/problems/drape-timeout',
    });
    expect(drape.status).toBe('pending');
  });

  it('ne rend plus pour une même demande un drapé échoué ou expiré', () => {
    const drape = pending();
    const later = new Date(new Date(NOW).getTime() + DRAPE_TIMEOUT_MS);
    expect(isReusable(drape, new Date(NOW))).toBe(true);
    expect(isReusable(drape, later)).toBe(false);
    expect(isReusable({ ...drape, status: 'failed' }, new Date(NOW))).toBe(false);
    expect(isReusable({ ...drape, status: 'completed' }, later)).toBe(true);
  });
});

describe('settle', () => {
  const outcome: DrapeOutcome = {
    kind: 'completed',
    result: {
      modelKey: 'drapes/o/k.glb',
      ease: { minMm: 1, medianMm: 2, maxMm: 3, tightAreaMm2: 4 },
      maxStrainPercent: 5,
      fabricEstimated: false,
    },
  };
  const done = new Date(NOW);

  it('termine un drapé en attente avec le résultat', () => {
    expect(settle(pending(), outcome, done)).toMatchObject({
      status: 'completed',
      modelKey: 'drapes/o/k.glb',
      completedAt: done,
    });
  });

  it('échoue un drapé en attente avec le type d’erreur', () => {
    expect(
      settle(pending(), { kind: 'failed', problemType: '/problems/drape-internal' }, done),
    ).toMatchObject({ status: 'failed', problemType: '/problems/drape-internal' });
  });

  it('ne change pas un drapé déjà terminé', () => {
    const settled = settle(pending(), outcome, done);
    expect(settled && settle(settled, { kind: 'failed', problemType: '/x' }, done)).toBeUndefined();
  });
});
