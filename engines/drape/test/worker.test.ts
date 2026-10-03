import { jsonSchemas } from '@atelier/contracts-ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTaskHandler, resultKeyOf } from '../src/adapters/handler.js';
import { cacheKeyOf, modelKeyOf } from '../src/node.js';
import { errorsOf, type Schema } from './schema-check.js';
import { job, NOW, setup, taskOf } from './worker-helpers.js';

const completedSchema = jsonSchemas.drapeCompleted as unknown as Schema;
const failedSchema = jsonSchemas.drapeFailed as unknown as Schema;
const cacheKey = cacheKeyOf(job);
const glbKey = modelKeyOf(job.organizationId, cacheKey);

afterEach(() => {
  vi.useRealTimers();
});

describe('tâche valide', () => {
  it('écrit le GLB sous la bonne clé, publie drape.completed conforme (enveloppe CloudEvents)', async () => {
    const { store, publisher, runner, deps } = setup();
    await createTaskHandler(deps)(taskOf(job));

    expect(runner.runs).toBe(1);
    expect(store.puts).toEqual([glbKey, resultKeyOf(job.organizationId, cacheKey)]);
    expect(glbKey).toBe(`drapes/${job.organizationId}/${cacheKey}.glb`);
    expect(publisher.messages).toHaveLength(1);
    const [message] = publisher.messages;
    expect(message?.subject).toBe('drape.completed');
    const [envelope] = publisher.envelopes();
    expect(envelope).toMatchObject({
      specversion: '1.0',
      type: 'drape.completed',
      source: '/engines/drape',
      time: NOW.toISOString(),
      datacontenttype: 'application/json',
    });
    expect(errorsOf(envelope?.['data'], completedSchema)).toEqual([]);
  });

  it('Nats-Msg-Id stable : le même drapé donne le même identifiant', async () => {
    const first = setup();
    const second = setup();
    await createTaskHandler(first.deps)(taskOf(job));
    await createTaskHandler(second.deps)(taskOf(job, { id: 'autre' }));
    expect(first.publisher.messages[0]?.msgId).toBe(`${job.drapeId}:completed`);
    expect(second.publisher.messages[0]?.msgId).toBe(first.publisher.messages[0]?.msgId);
  });
});

describe('enveloppe publiée', () => {
  const envelopeSchema = jsonSchemas.cloudEvent as unknown as Schema;

  it.each([
    ['completed', undefined],
    ['failed', '/problems/drape-placement-missing' as const],
  ])(
    '%s : enveloppe complète conforme à cloud-event.schema.json, id stable',
    async (_, problem) => {
      const run = async () => {
        const { publisher, runner, deps } = setup();
        runner.problem = problem;
        await createTaskHandler(deps)(taskOf(job));
        return publisher;
      };
      const first = await run();
      const second = await run();
      const [envelope] = first.envelopes();
      expect(errorsOf(envelope, envelopeSchema)).toEqual([]);
      expect(envelope?.['id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(second.envelopes()[0]?.['id']).toBe(envelope?.['id']);
      expect(first.messages[0]?.msgId).toBe(`${job.drapeId}:${_}`);
    },
  );

  it('l’id diffère entre les issues et entre les drapés', async () => {
    const a = setup();
    const b = setup();
    b.runner.problem = '/problems/drape-placement-missing';
    await createTaskHandler(a.deps)(taskOf(job));
    await createTaskHandler(b.deps)(taskOf(job));
    expect(a.publisher.envelopes()[0]?.['id']).not.toBe(b.publisher.envelopes()[0]?.['id']);
  });
});

describe('modèle déjà calculé', () => {
  it('ne simule pas et publie le même événement', async () => {
    const { store, publisher, runner, deps } = setup();
    const handler = createTaskHandler(deps);
    await handler(taskOf(job));
    const putsBefore = store.puts.length;
    const other = { ...job, drapeId: '00000000-0000-4000-8000-0000000000aa' };
    await handler(taskOf(other));

    expect(runner.runs).toBe(1);
    expect(store.puts).toHaveLength(putsBefore);
    const [first, second] = publisher.envelopes().map((e) => e['data'] as { result: unknown });
    expect(second?.result).toEqual(first?.result);
    expect(publisher.messages[1]?.msgId).toBe(`${other.drapeId}:completed`);
  });

  it('une autre organisation ne lit pas le cache de la première : recalcul, écritures sous son préfixe', async () => {
    const { store, runner, deps } = setup();
    const handler = createTaskHandler(deps);
    await handler(taskOf(job));
    const other = { ...job, organizationId: '00000000-0000-4000-8000-0000000000bb' };
    store.puts.length = 0;
    await handler(taskOf(other));

    expect(runner.runs).toBe(2);
    expect(store.puts).toHaveLength(2);
    expect(store.puts.every((k) => k.startsWith(`drapes/${other.organizationId}/`))).toBe(true);
    expect(store.puts).toContain(modelKeyOf(other.organizationId, cacheKeyOf(other)));
  });

  it('un résultat stocké illisible ou d’une autre clé est recalculé', async () => {
    const { store, runner, deps } = setup();
    store.objects.set(
      resultKeyOf(job.organizationId, cacheKey),
      new TextEncoder().encode('pas du json'),
    );
    await createTaskHandler(deps)(taskOf(job));
    expect(runner.runs).toBe(1);
  });
});

describe('échec attendu du moteur', () => {
  it('publie drape.failed conforme puis rend la main (acquittement)', async () => {
    const { store, publisher, runner, deps } = setup();
    runner.problem = '/problems/drape-placement-missing';
    await expect(createTaskHandler(deps)(taskOf(job))).resolves.toBeUndefined();

    expect(store.puts).toEqual([]);
    expect(publisher.messages[0]?.subject).toBe('drape.failed');
    expect(publisher.messages[0]?.msgId).toBe(`${job.drapeId}:failed`);
    const [envelope] = publisher.envelopes();
    expect(errorsOf(envelope?.['data'], failedSchema)).toEqual([]);
    expect(envelope?.['data']).toMatchObject({ type: '/problems/drape-placement-missing' });
  });
});

describe('message invalide', () => {
  it('enveloppe illisible : rien publié, sujet journalisé, aucun contenu', async () => {
    const { publisher, runner, logger, deps } = setup();
    const message = {
      subject: 'drape.requested',
      data: new TextEncoder().encode('{pas du json'),
      working: vi.fn(),
    };
    await expect(createTaskHandler(deps)(message)).resolves.toBeUndefined();
    expect(publisher.messages).toEqual([]);
    expect(runner.runs).toBe(0);
    expect(logger.lines).toHaveLength(1);
    expect(logger.lines[0]).toContain('task.invalid');
    expect(logger.lines[0]).not.toContain('pas du json');
  });

  it('données hors contrat mais identifiants lisibles : drape.failed drape-internal, mesures non journalisées', async () => {
    const { publisher, runner, logger, deps } = setup();
    const broken = { ...job, quality: 'ultra', measurements: { statureMm: 123456 } };
    await createTaskHandler(deps)(taskOf(broken));

    expect(runner.runs).toBe(0);
    const [envelope] = publisher.envelopes();
    expect(envelope?.['data']).toMatchObject({
      drapeId: job.drapeId,
      type: '/problems/drape-internal',
      retryable: false,
    });
    expect(errorsOf(envelope?.['data'], failedSchema)).toEqual([]);
    const journal = logger.lines.join('\n');
    expect(journal).toContain('"subject":"drape.requested"');
    expect(journal).toContain('"eventId":"evt-1"');
    expect(journal).not.toContain('123456');
    expect(journal).not.toContain(job.drapeId);
  });

  it('enveloppe de mauvais type : publiée en échec interne, pas de calcul', async () => {
    const { publisher, runner, deps } = setup();
    await createTaskHandler(deps)(taskOf(job, { type: 'design.versioned' }));
    expect(runner.runs).toBe(0);
    expect(publisher.messages[0]?.subject).toBe('drape.failed');
  });

  it('identifiant du drapé illisible : acquitté sans rien publier', async () => {
    const { publisher, deps } = setup();
    await createTaskHandler(deps)(taskOf({ ...job, drapeId: 'pas-un-uuid' }));
    expect(publisher.messages).toEqual([]);
  });
});

describe('pannes (le message sera renvoyé, pas acquitté)', () => {
  it('panne S3 : le gestionnaire rejette et rien n’est publié', async () => {
    const { store, publisher, deps } = setup();
    store.failing = true;
    await expect(createTaskHandler(deps)(taskOf(job))).rejects.toThrow();
    expect(publisher.messages).toEqual([]);
  });

  it('panne NATS à la publication : le gestionnaire rejette', async () => {
    const { publisher, deps } = setup();
    publisher.failing = true;
    await expect(createTaskHandler(deps)(taskOf(job))).rejects.toThrow();
  });

  it('fil de calcul perdu : le gestionnaire rejette', async () => {
    const { runner, deps } = setup();
    runner.failing = true;
    await expect(createTaskHandler(deps)(taskOf(job))).rejects.toThrow();
  });
});

describe('signaux de travail', () => {
  it('émis à chaque intervalle pendant un calcul long, puis arrêtés', async () => {
    vi.useFakeTimers();
    const { runner, deps } = setup();
    let release = (): void => undefined;
    runner.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const message = taskOf(job);
    const done = createTaskHandler(deps)(message);

    await vi.advanceTimersByTimeAsync(3500);
    expect(message.workings).toBe(3);
    release();
    await done;
    await vi.advanceTimersByTimeAsync(5000);
    expect(message.workings).toBe(3);
  });

  it('même après un échec, le minuteur est arrêté', async () => {
    vi.useFakeTimers();
    const { runner, deps } = setup();
    runner.failing = true;
    const message = taskOf(job);
    await expect(createTaskHandler(deps)(message)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(5000);
    expect(message.workings).toBe(0);
  });
});
