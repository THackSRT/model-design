import type { CloudEventEnvelope } from '@atelier/contracts-ts';
import { jetstream, type JetStreamClient } from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/transport-node';
import type { EventPublisher } from '../outbox/ports.js';

/**
 * Publie sur NATS JetStream. Sujet NATS = `type` de l'événement (adresse du canal AsyncAPI, ex. `design.versioned`).
 * `Nats-Msg-Id` = id CloudEvents = id de la ligne d'outbox : JetStream déduplique les republications.
 */
export class JetStreamPublisher implements EventPublisher {
  private readonly js: JetStreamClient;
  private readonly encoder = new TextEncoder();

  constructor(connection: NatsConnection) {
    this.js = jetstream(connection);
  }

  async publish(event: CloudEventEnvelope): Promise<void> {
    await this.js.publish(event.type, this.encoder.encode(JSON.stringify(event)), {
      msgID: event.id,
    });
  }
}
