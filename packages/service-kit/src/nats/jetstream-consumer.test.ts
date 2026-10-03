import { describe, expect, it } from 'vitest';
import { createLogger } from '../logger.js';
import { type AckableMessage, processMessages } from './jetstream-consumer.js';

function fakeMessage(subject: string, text: string) {
  const outcomes: string[] = [];
  const message: AckableMessage = {
    subject,
    data: new TextEncoder().encode(text),
    ack: () => void outcomes.push('ack'),
    nak: (delayMs) => void outcomes.push(`nak:${String(delayMs)}`),
  };
  return { message, outcomes };
}

async function* of(...items: AckableMessage[]) {
  for (const item of items) yield item;
}

describe('processMessages', () => {
  const lines: string[] = [];
  const logger = createLogger({}, (l) => lines.push(l));

  it('acquitte un message traité, dans l’ordre', async () => {
    const a = fakeMessage('x.a', 'one');
    const b = fakeMessage('x.b', 'two');
    const seen: string[] = [];
    await processMessages(
      of(a.message, b.message),
      async (m) => void seen.push(`${m.subject}:${new TextDecoder().decode(m.data)}`),
      { logger, retryDelayMs: 10 },
    );
    expect(seen).toEqual(['x.a:one', 'x.b:two']);
    expect(a.outcomes).toEqual(['ack']);
    expect(b.outcomes).toEqual(['ack']);
  });

  it('renvoie plus tard un message dont le traitement échoue, sans journaliser son contenu', async () => {
    const a = fakeMessage('x.a', 'secret-content');
    await processMessages(
      of(a.message),
      async () => {
        throw new TypeError('secret-content');
      },
      { logger, retryDelayMs: 1234 },
    );
    expect(a.outcomes).toEqual(['nak:1234']);
    expect(lines.join('\n')).toContain('consumer.handler-failed');
    expect(lines.join('\n')).not.toContain('secret-content');
  });
});
