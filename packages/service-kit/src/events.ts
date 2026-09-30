import type { CloudEventEnvelope } from '@atelier/contracts-ts';
import type { DomainEvent } from '@atelier/kernel';

export interface EnvelopeInput {
  id: string;
  source: string;
  time: Date;
}

export function toCloudEvent(event: DomainEvent, meta: EnvelopeInput): CloudEventEnvelope {
  return {
    specversion: '1.0',
    id: meta.id,
    source: meta.source,
    type: event.type,
    subject: event.subject,
    time: meta.time.toISOString(),
    datacontenttype: 'application/json',
    data: { ...event.data },
  };
}
