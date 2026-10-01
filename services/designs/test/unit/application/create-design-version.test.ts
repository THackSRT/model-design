import type { DesignId } from '../../../src/domain/design.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { type DesignsDeps, designsUseCases } from '../../../src/application/use-cases/index.js';
import { InMemoryDesignRepository } from '../../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { nodeHasher } from '../../../src/adapters/platform/node-hasher.js';
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
import { FakePatterningEngine } from '../../doubles/fake-patterning-engine.js';

describe('créer une version de modèle', () => {
  let designs: InMemoryDesignRepository;
  const deps = (patterning = new FakePatterningEngine()): DesignsDeps => ({
    designs,
    patterning,
    manufacturing: new FakeManufacturingEngine(),
    hasher: nodeHasher,
    ids: sequentialIds(),
    clock,
  });
  const input = {
    organizationId: ORG,
    designId: aDesign().id,
    measurements: someMeasurements(),
    garment: aSkirt(),
  };

  beforeEach(async () => {
    designs = new InMemoryDesignRepository();
    await designs.create(aDesign());
  });

  it('calcule le patron, enregistre la version et publie l’événement', async () => {
    const version = await designsUseCases(deps()).createDesignVersion(input);
    expect(version.isOk() && version.value.number).toBe(1);
    expect(designs.outbox.map((e) => e.type)).toEqual(['design.versioned']);
  });

  it('donne la même empreinte aux mêmes entrées, quel que soit l’ordre des champs', async () => {
    const useCases = designsUseCases(deps());
    const first = await useCases.createDesignVersion(input);
    const reordered = {
      ...input,
      measurements: Object.fromEntries(Object.entries(someMeasurements()).reverse()) as never,
    };
    const second = await useCases.createDesignVersion(reordered);
    expect(
      first.isOk() && second.isOk() && first.value.fingerprint === second.value.fingerprint,
    ).toBe(true);
  });

  it('ne trouve pas le modèle d’une autre organisation', async () => {
    const version = await designsUseCases(deps()).createDesignVersion({
      ...input,
      organizationId: OTHER_ORG,
    });
    expect(version.isErr() && version.error.kind).toBe('design-not-found');
  });

  it('remonte un patron impossible sans rien enregistrer', async () => {
    const engine = new FakePatterningEngine({ kind: 'pattern-impossible', detail: 'trop courte' });
    const version = await designsUseCases(deps(engine)).createDesignVersion(input);
    expect(version.isErr() && version.error.kind).toBe('pattern-impossible');
    expect(designs.outbox).toHaveLength(0);
  });

  it('refuse une demande dont le type ne correspond pas à celui du modèle', async () => {
    const trousers = aDesign({
      id: '01920000-0000-7000-8000-00000000d002' as DesignId,
      garmentType: 'trousers',
    });
    await designs.create(trousers);
    const version = await designsUseCases(deps()).createDesignVersion({
      ...input,
      designId: trousers.id,
    });
    expect(version.isErr() && version.error.kind).toBe('garment-type-mismatch');
    expect(designs.outbox).toHaveLength(0);
  });
});
