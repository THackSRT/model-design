import type { DrapeRequest } from '@atelier/contracts-ts';
import type { Clock } from '@atelier/kernel';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { InMemoryDrapeRepository } from '../../../src/adapters/persistence/in-memory/in-memory-drape-repository.js';
import { nodeHasher } from '../../../src/adapters/platform/node-hasher.js';
import { designsUseCases } from '../../../src/application/use-cases/index.js';
import { DRAPE_TIMEOUT_MS, type DrapeId } from '../../../src/domain/drape.js';
import {
  aDesign,
  aSkirt,
  NOW,
  OTHER_ORG,
  ORG,
  sequentialIds,
  someMeasurements,
} from '../../builders.js';
import { FakeManufacturingEngine } from '../../doubles/fake-manufacturing-engine.js';
import { FakeObjectStore } from '../../doubles/fake-object-store.js';
import { FakePatterningEngine } from '../../doubles/fake-patterning-engine.js';

const request: DrapeRequest = { fabric: { preset: 'cotton-poplin' } };

describe('demander et lire le drapé d’une version', () => {
  let designs: InMemoryDesignRepository;
  let drapes: InMemoryDrapeRepository;
  let nowMs: number;
  let useCases: ReturnType<typeof designsUseCases>;
  const clock: Clock = { now: () => new Date(nowMs) };
  const target = { organizationId: ORG, designId: aDesign().id, number: 1 };

  beforeEach(async () => {
    nowMs = new Date(NOW).getTime();
    designs = new InMemoryDesignRepository();
    drapes = new InMemoryDrapeRepository();
    await designs.create(aDesign());
    useCases = designsUseCases({
      designs,
      drapes,
      patterning: new FakePatterningEngine(),
      manufacturing: new FakeManufacturingEngine(),
      models: new FakeObjectStore(),
      hasher: nodeHasher,
      ids: sequentialIds(),
      clock,
    });
    await useCases.createDesignVersion({
      organizationId: ORG,
      designId: aDesign().id,
      measurements: someMeasurements(),
      garment: aSkirt(),
    });
  });

  it('crée un drapé en attente et publie drape.requested', async () => {
    const result = await useCases.requestVersionDrape({ ...target, request });
    expect(result.isOk() && result.value.created).toBe(true);
    expect(result.isOk() && result.value.drape.status).toBe('pending');
    expect(drapes.outbox.map((e) => e.type)).toEqual(['drape.requested']);
  });

  it('rend le drapé existant pour la même demande, sans second événement', async () => {
    const first = await useCases.requestVersionDrape({ ...target, request });
    const again = await useCases.requestVersionDrape({
      ...target,
      request: { fabric: { preset: 'cotton-poplin' }, avatar: {}, quality: 'standard' },
    });
    expect(again.isOk() && again.value.created).toBe(false);
    expect(again.isOk() && first.isOk() && again.value.drape.id).toBe(
      first.isOk() && first.value.drape.id,
    );
    expect(drapes.outbox).toHaveLength(1);
  });

  it('crée un autre drapé pour une autre demande', async () => {
    await useCases.requestVersionDrape({ ...target, request });
    const other = await useCases.requestVersionDrape({
      ...target,
      request: { ...request, quality: 'draft' },
    });
    expect(other.isOk() && other.value.created).toBe(true);
    expect(drapes.outbox).toHaveLength(2);
  });

  it('refait un drapé quand le précédent est expiré', async () => {
    const first = await useCases.requestVersionDrape({ ...target, request });
    nowMs += DRAPE_TIMEOUT_MS;
    const second = await useCases.requestVersionDrape({ ...target, request });
    expect(second.isOk() && second.value.created).toBe(true);
    expect(second.isOk() && first.isOk() && second.value.drape.id !== first.value.drape.id).toBe(
      true,
    );
  });

  it('ne trouve ni version inconnue, ni modèle d’une autre organisation', async () => {
    const unknown = await useCases.requestVersionDrape({ ...target, number: 9, request });
    expect(unknown.isErr() && unknown.error.kind).toBe('version-not-found');
    const foreign = await useCases.requestVersionDrape({
      ...target,
      organizationId: OTHER_ORG,
      request,
    });
    expect(foreign.isErr() && foreign.error.kind).toBe('design-not-found');
    expect(drapes.outbox).toHaveLength(0);
  });

  it('lit le drapé en attente, puis échoué (drape-timeout) après 10 minutes', async () => {
    const created = await useCases.requestVersionDrape({ ...target, request });
    const drapeId = (created.isOk() ? created.value.drape.id : '') as DrapeId;
    const pending = await useCases.getVersionDrape({ ...target, drapeId });
    expect(pending.isOk() && pending.value.status).toBe('pending');
    nowMs += DRAPE_TIMEOUT_MS;
    const late = await useCases.getVersionDrape({ ...target, drapeId });
    expect(late.isOk() && late.value).toMatchObject({
      status: 'failed',
      problemType: '/problems/drape-timeout',
    });
  });

  it('ne lit pas le drapé d’une autre organisation, d’une autre version ou inconnu', async () => {
    const created = await useCases.requestVersionDrape({ ...target, request });
    const drapeId = (created.isOk() ? created.value.drape.id : '') as DrapeId;
    for (const scope of [{ organizationId: OTHER_ORG }, { number: 2 }]) {
      const result = await useCases.getVersionDrape({ ...target, ...scope, drapeId });
      expect(result.isErr() && result.error.kind).toBe('drape-not-found');
    }
    const missing = await useCases.getVersionDrape({
      ...target,
      drapeId: '01920000-0000-7000-8000-0000000000ee' as DrapeId,
    });
    expect(missing.isErr() && missing.error.kind).toBe('drape-not-found');
  });
});
