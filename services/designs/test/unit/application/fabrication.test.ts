import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryDesignRepository } from '../../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { InMemoryDrapeRepository } from '../../../src/adapters/persistence/in-memory/in-memory-drape-repository.js';
import { nodeHasher } from '../../../src/adapters/platform/node-hasher.js';
import { type DesignsDeps, designsUseCases } from '../../../src/application/use-cases/index.js';
import type { DesignId } from '../../../src/domain/design.js';
import {
  aDesign,
  aSkirt,
  clock,
  ORG,
  OTHER_ORG,
  sequentialIds,
  someMeasurements,
} from '../../builders.js';
import {
  FAKE_FILE_BYTES,
  FakeManufacturingEngine,
} from '../../doubles/fake-manufacturing-engine.js';
import { FakeObjectStore } from '../../doubles/fake-object-store.js';
import { FakePatterningEngine } from '../../doubles/fake-patterning-engine.js';

describe('pièces de coupe et exports d’une version', () => {
  let designs: InMemoryDesignRepository;
  let manufacturing: FakeManufacturingEngine;
  const useCases = () => {
    const deps: DesignsDeps = {
      designs,
      drapes: new InMemoryDrapeRepository(),
      patterning: new FakePatterningEngine(),
      manufacturing,
      models: new FakeObjectStore(),
      hasher: nodeHasher,
      ids: sequentialIds(),
      clock,
    };
    return designsUseCases(deps);
  };
  const target = { organizationId: ORG, designId: aDesign().id, number: 1 };

  beforeEach(async () => {
    designs = new InMemoryDesignRepository();
    manufacturing = new FakeManufacturingEngine();
    await designs.create(aDesign());
    await useCases().createDesignVersion({
      organizationId: ORG,
      designId: aDesign().id,
      measurements: someMeasurements(),
      garment: aSkirt(),
    });
  });

  it('envoie au moteur la spécification de la version et les options', async () => {
    const result = await useCases().getVersionCutPattern({ ...target, sizeLabel: '38' });
    expect(result.isOk()).toBe(true);
    expect(manufacturing.cutCalls).toHaveLength(1);
    expect(manufacturing.cutCalls[0]?.spec.garment.type).toBe('straight-skirt');
    expect(manufacturing.cutCalls[0]?.options.sizeLabel).toBe('38');
  });

  it.each([
    ['version absente', { ...target, number: 2 }, 'version-not-found'],
    ['numéro invalide', { ...target, number: 0 }, 'version-not-found'],
    ['modèle absent', { ...target, designId: 'absent' as DesignId }, 'design-not-found'],
    ['autre organisation', { ...target, organizationId: OTHER_ORG }, 'design-not-found'],
  ])('%s : introuvable, sans appeler le moteur', async (_name, input, kind) => {
    const cut = await useCases().getVersionCutPattern(input);
    const file = await useCases().exportVersion({ ...input, format: 'svg' });
    expect(cut.isErr() && cut.error.kind).toBe(kind);
    expect(file.isErr() && file.error.kind).toBe(kind);
    expect(manufacturing.cutCalls).toHaveLength(0);
    expect(manufacturing.exportCalls).toHaveLength(0);
  });

  it('exporte les octets du moteur sous un nom contrôlé', async () => {
    const result = await useCases().exportVersion({
      ...target,
      format: 'pdf-a4-tiled',
      sizeLabel: '38',
    });
    expect(result.isOk() && result.value).toEqual({
      bytes: FAKE_FILE_BYTES,
      format: 'pdf-a4-tiled',
      fileName: 'straight-skirt-v1-38.pdf',
    });
  });

  it('relaie l’échec du moteur', async () => {
    manufacturing = new FakeManufacturingEngine({
      kind: 'manufacturing-problem',
      type: 'allowance-on-fold',
      detail: 'x',
    });
    const result = await useCases().exportVersion({ ...target, format: 'svg' });
    expect(result.isErr() && result.error.kind).toBe('manufacturing-problem');
  });
});
