import type { Clock } from '@atelier/kernel';
import { createLogger } from '@atelier/service-kit';
import type { MessageHandler } from '@atelier/service-kit/nats';
import { beforeEach, describe, expect, it } from 'vitest';
import { drapeResultHandler } from '../../../src/adapters/messaging/drape-result-handler.js';
import { InMemoryDesignRepository } from '../../../src/adapters/persistence/in-memory/in-memory-design-repository.js';
import { InMemoryDrapeRepository } from '../../../src/adapters/persistence/in-memory/in-memory-drape-repository.js';
import { nodeHasher } from '../../../src/adapters/platform/node-hasher.js';
import { designsUseCases } from '../../../src/application/use-cases/index.js';
import { DRAPE_TIMEOUT_MS, type DrapeId } from '../../../src/domain/drape.js';
import {
  aDesign,
  aSkirt,
  NOW,
  ORG,
  OTHER_ORG,
  sequentialIds,
  someMeasurements,
} from '../../builders.js';
import {
  completedData,
  envelope,
  failedData,
  message,
  modelKeyOf,
} from '../../doubles/drape-events.js';
import { FakeManufacturingEngine } from '../../doubles/fake-manufacturing-engine.js';
import { FakeObjectStore } from '../../doubles/fake-object-store.js';
import { FakePatterningEngine } from '../../doubles/fake-patterning-engine.js';

describe('recevoir le résultat du drapé (drape.completed, drape.failed)', () => {
  let nowMs: number;
  let useCases: ReturnType<typeof designsUseCases>;
  let handle: MessageHandler;
  let drapeId: DrapeId;
  let logs: string[];
  const clock: Clock = { now: () => new Date(nowMs) };
  const designId = aDesign().id;
  const target = () => ({ drapeId, designId });
  const completed = (data = completedData(target())) =>
    message('drape.completed', envelope('drape.completed', data));
  const failed = (data = failedData(target())) =>
    message('drape.failed', envelope('drape.failed', data));
  const read = async () => {
    const drape = await useCases.getVersionDrape({
      organizationId: ORG,
      designId,
      number: 1,
      drapeId,
    });
    if (drape.isErr()) throw new Error('drapé introuvable');
    return drape.value;
  };

  beforeEach(async () => {
    nowMs = new Date(NOW).getTime();
    logs = [];
    const designs = new InMemoryDesignRepository();
    await designs.create(aDesign());
    useCases = designsUseCases({
      designs,
      drapes: new InMemoryDrapeRepository(),
      patterning: new FakePatterningEngine(),
      manufacturing: new FakeManufacturingEngine(),
      models: new FakeObjectStore(),
      hasher: nodeHasher,
      ids: sequentialIds(),
      clock,
    });
    await useCases.createDesignVersion({
      organizationId: ORG,
      designId,
      measurements: someMeasurements(),
      garment: aSkirt(),
    });
    const requested = await useCases.requestVersionDrape({
      organizationId: ORG,
      designId,
      number: 1,
      request: { fabric: { preset: 'denim' } },
    });
    if (requested.isErr()) throw new Error('demande refusée');
    drapeId = requested.value.drape.id;
    handle = drapeResultHandler(
      useCases.recordDrapeOutcome,
      createLogger({}, (line) => logs.push(line)),
    );
  });

  it('drape.completed : le drapé est terminé, avec son résultat', async () => {
    await handle(completed());
    expect(await read()).toMatchObject({
      status: 'completed',
      modelKey: modelKeyOf(),
      maxStrainPercent: 4.5,
      fabricEstimated: true,
      ease: { minMm: 2, medianMm: 18, maxMm: 60, tightAreaMm2: 1200 },
      completedAt: new Date(NOW),
    });
  });

  it('doublon : le premier résultat gagne, rien ne change', async () => {
    await handle(completed());
    const before = await read();
    const other = completedData(target());
    other.result.maxStrainPercent = 99;
    nowMs += 60_000;
    await handle(completed(other));
    await handle(failed());
    expect(await read()).toEqual(before);
    expect(logs.join('\n')).toContain('drape-result.already-settled');
  });

  it('drape.failed : le drapé est échoué avec le type d’erreur', async () => {
    await handle(failed());
    expect(await read()).toMatchObject({
      status: 'failed',
      problemType: '/problems/drape-seam-not-closed',
    });
  });

  it.each([
    ['du texte qui n’est pas du JSON', () => 'secret-not-json'],
    ['une enveloppe invalide', () => ({ hello: 'secret-world' })],
    [
      'des données hors contrat',
      () => envelope('drape.completed', { drapeId, secret: 'secret-x' }),
    ],
    [
      'une clé de modèle d’une autre organisation',
      () =>
        envelope('drape.completed', {
          ...completedData(target()),
          result: { ...completedData(target()).result, modelKey: modelKeyOf(OTHER_ORG) },
        }),
    ],
  ])(
    'message invalide (%s) : acquitté, journalisé sans contenu, drapé inchangé',
    async (_name, payload) => {
      await expect(handle(message('drape.completed', payload()))).resolves.toBeUndefined();
      expect((await read()).status).toBe('pending');
      const text = logs.join('\n');
      expect(text).toContain('drape-result.ignored');
      expect(text).not.toContain('secret');
    },
  );

  it('autre type d’événement : acquitté et ignoré', async () => {
    await handle(message('design.versioned', envelope('design.versioned', {})));
    expect((await read()).status).toBe('pending');
  });

  it('drapé inconnu : acquitté, journalisé avec son identifiant', async () => {
    const unknown = '01920000-0000-7000-8000-0000000000ee';
    await handle(completed(completedData({ drapeId: unknown, designId })));
    expect(logs.join('\n')).toContain('drape-result.unknown');
    expect((await read()).status).toBe('pending');
  });

  it('organisation différente de celle du drapé : ignoré', async () => {
    const foreign = { ...target(), organizationId: OTHER_ORG };
    await handle(completed(completedData(foreign)));
    await handle(failed(failedData(foreign)));
    expect((await read()).status).toBe('pending');
    expect(logs.join('\n')).toContain('drape-result.unknown');
  });

  it('résultat tardif après 10 minutes : accepté, il remplace le drape-timeout calculé', async () => {
    nowMs += DRAPE_TIMEOUT_MS + 1000;
    expect(await read()).toMatchObject({
      status: 'failed',
      problemType: '/problems/drape-timeout',
    });
    await handle(completed());
    const drape = await read();
    expect(drape.status).toBe('completed');
    expect(drape.problemType).toBeUndefined();
    expect(drape.modelKey).toBe(modelKeyOf());
  });

  it('aucun journal ne contient de mesure ni le contenu de l’événement', async () => {
    await handle(completed());
    await handle(failed());
    const text = logs.join('\n');
    expect(text).not.toContain(String(someMeasurements().statureMm));
    expect(text).not.toContain('chestGirthMm');
    expect(text).not.toContain(modelKeyOf());
    expect(text).not.toContain('tightAreaMm2');
  });

  it('une panne du dépôt fait rejeter le message (il sera renvoyé)', async () => {
    const failing = drapeResultHandler(
      async () => {
        throw new Error('base indisponible');
      },
      createLogger({}, () => undefined),
    );
    await expect(failing(completed())).rejects.toThrow();
  });
});
