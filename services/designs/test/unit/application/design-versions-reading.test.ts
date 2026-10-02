import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { InMemoryDrapeRepository } from '../../../src/adapters/persistence/in-memory/in-memory-drape-repository.js';
import { nodeHasher } from '../../../src/adapters/platform/node-hasher.js';
import { type DesignsDeps, designsUseCases } from '../../../src/application/use-cases/index.js';
import {
  aDesign,
  aSkirt,
  clock,
  OTHER_ORG,
  ORG,
  sequentialIds,
  someMeasurements,
} from '../../builders.js';
import { FakeManufacturingEngine } from '../../doubles/fake-manufacturing-engine.js';
import { FakeObjectStore } from '../../doubles/fake-object-store.js';
import { FakePatterningEngine } from '../../doubles/fake-patterning-engine.js';

describe('lire les versions d’un modèle', () => {
  let designs: InMemoryDesignRepository;
  let useCases: ReturnType<typeof designsUseCases>;
  const scope = { organizationId: ORG, designId: aDesign().id };

  beforeEach(async () => {
    designs = new InMemoryDesignRepository();
    await designs.create(aDesign());
    const deps: DesignsDeps = {
      designs,
      drapes: new InMemoryDrapeRepository(),
      patterning: new FakePatterningEngine(),
      manufacturing: new FakeManufacturingEngine(),
      models: new FakeObjectStore(),
      hasher: nodeHasher,
      ids: sequentialIds(),
      clock,
    };
    useCases = designsUseCases(deps);
    for (const lengthMm of [600, 620, 640]) {
      await useCases.createDesignVersion({
        ...scope,
        measurements: someMeasurements(),
        garment: aSkirt(lengthMm),
      });
    }
  });

  it('liste du plus récent au plus ancien, avec un point de reprise tant qu’il reste des versions', async () => {
    const first = await useCases.listDesignVersions({ ...scope, limit: 2 });
    expect(first.isOk() && first.value.items.map((i) => i.number)).toEqual([3, 2]);
    expect(first.isOk() && first.value.nextBefore).toBe(2);
    const second = await useCases.listDesignVersions({ ...scope, limit: 2, before: 2 });
    expect(second.isOk() && second.value.items.map((i) => i.number)).toEqual([1]);
    expect(second.isOk() && second.value.nextBefore).toBeUndefined();
  });

  it('refuse le modèle d’une autre organisation', async () => {
    const result = await useCases.listDesignVersions({
      ...scope,
      organizationId: OTHER_ORG,
      limit: 20,
    });
    expect(result.isErr() && result.error.kind).toBe('design-not-found');
  });

  it('distingue version inconnue (n ou since) et modèle inconnu', async () => {
    const unknownN = await useCases.getVersionChanges({ ...scope, number: 9, since: 1 });
    const unknownSince = await useCases.getVersionChanges({ ...scope, number: 2, since: 9 });
    const other = await useCases.getVersionChanges({
      ...scope,
      organizationId: OTHER_ORG,
      number: 2,
      since: 1,
    });
    expect(unknownN.isErr() && unknownN.error.kind).toBe('version-not-found');
    expect(unknownSince.isErr() && unknownSince.error.kind).toBe('version-not-found');
    expect(other.isErr() && other.error.kind).toBe('design-not-found');
  });

  it('compare deux versions, et une version à elle-même', async () => {
    const diff = await useCases.getVersionChanges({ ...scope, number: 3, since: 1 });
    expect(diff.isOk() && diff.value.params).toEqual([{ path: 'lengthMm', from: 600, to: 640 }]);
    expect(diff.isOk() && [diff.value.from.number, diff.value.to.number]).toEqual([1, 3]);
    const same = await useCases.getVersionChanges({ ...scope, number: 2, since: 2 });
    expect(same.isOk() && same.value).toMatchObject({ sameFingerprint: true, params: [] });
  });
});
