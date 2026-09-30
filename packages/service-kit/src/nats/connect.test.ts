import { describe, expect, it } from 'vitest';
import { natsConnectionOptions } from './connect.js';

describe('options de connexion NATS', () => {
  it('reconnecte sans limite et nomme la connexion', () => {
    expect(natsConnectionOptions('nats://nats:4222', 'designs')).toEqual({
      servers: 'nats://nats:4222',
      name: 'designs',
      maxReconnectAttempts: -1,
    });
  });
});
