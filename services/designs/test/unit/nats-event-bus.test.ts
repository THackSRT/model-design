import { createLogger } from '@atelier/service-kit';
import { describe, expect, it } from 'vitest';
import { connectEventBus } from '../../src/adapters/messaging/nats-event-bus.js';

describe('connexion au bus', () => {
  it('réessaie tant que NATS est injoignable, journalise l’attente, et s’annule proprement', async () => {
    const events: string[] = [];
    const logger = createLogger({}, (line) =>
      events.push((JSON.parse(line) as { event: string }).event),
    );
    const abort = new AbortController();
    const pending = connectEventBus('nats://127.0.0.1:1', {
      signal: abort.signal,
      logger,
      retryDelayMs: 20,
    });
    const outcome = pending.then(
      () => 'connected',
      (error: unknown) => (error as Error).name,
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    abort.abort();
    expect(await outcome).toBe('AbortError');
    expect(events.filter((e) => e === 'nats.waiting').length).toBeGreaterThanOrEqual(2);
  });
});
