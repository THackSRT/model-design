import type { DrapeCompleted, DrapeFailed, DrapeJob } from '@atelier/contracts-ts';

// Lecture d'une tâche `drape.requested` (enveloppe CloudEvents + DrapeJob) et fabrication des enveloppes de résultat,
// identiques à `toCloudEvent` de service-kit. Contrôle de structure seulement : le détail des valeurs (bornes du
// patron, mesures) est validé par le moteur lui-même. Rien de ce qui est lu n'est journalisé.

export const SOURCE = '/engines/drape';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SAFE_ID = /^[\w.:-]{1,100}$/;

export type JobIds = Pick<DrapeJob, 'drapeId' | 'designId' | 'versionNumber' | 'organizationId'>;

export type ParsedTask =
  | { kind: 'job'; job: DrapeJob }
  /** `eventId` : identifiant CloudEvents s'il est sûr à journaliser ; `ids` : s'ils sont tous lisibles. */
  | { kind: 'invalid'; eventId?: string; ids?: JobIds };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

function idsOf(data: Record<string, unknown>): JobIds | undefined {
  const { drapeId, designId, organizationId, versionNumber } = data;
  if (!isUuid(drapeId) || !isUuid(designId) || !isUuid(organizationId)) return undefined;
  if (
    typeof versionNumber !== 'number' ||
    !Number.isSafeInteger(versionNumber) ||
    versionNumber < 1
  ) {
    return undefined;
  }
  return { drapeId, designId, organizationId, versionNumber };
}

const isJobData = (data: Record<string, unknown>): boolean =>
  isRecord(data['spec']) &&
  isRecord(data['measurements']) &&
  isRecord(data['avatar']) &&
  isRecord(data['fabric']) &&
  (data['quality'] === 'draft' || data['quality'] === 'standard');

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

const isEnvelope = (envelope: Record<string, unknown>): boolean =>
  envelope['specversion'] === '1.0' &&
  envelope['type'] === 'drape.requested' &&
  typeof envelope['id'] === 'string' &&
  envelope['id'] !== '' &&
  typeof envelope['source'] === 'string' &&
  typeof envelope['time'] === 'string' &&
  envelope['datacontenttype'] === 'application/json';

export function parseTask(bytes: Uint8Array): ParsedTask {
  const envelope = parseJson(bytes);
  if (!isRecord(envelope)) return { kind: 'invalid' };
  const id = envelope['id'];
  const eventId = typeof id === 'string' && SAFE_ID.test(id) ? id : undefined;
  const base = eventId === undefined ? {} : { eventId };
  const data = envelope['data'];
  if (!isRecord(data)) return { kind: 'invalid', ...base };
  const ids = idsOf(data);
  if (ids === undefined) return { kind: 'invalid', ...base };
  if (!isEnvelope(envelope) || !isJobData(data)) return { kind: 'invalid', ...base, ids };
  return { kind: 'job', job: data as unknown as DrapeJob };
}

export interface ResultMessage {
  /** Sujet NATS = `type` de l'événement. */
  subject: 'drape.completed' | 'drape.failed';
  /** `Nats-Msg-Id` : stable par drapé et par issue, JetStream déduplique les republications. */
  msgId: string;
  body: Uint8Array;
}

function resultMessage(
  subject: ResultMessage['subject'],
  data: DrapeCompleted | DrapeFailed,
  now: Date,
): ResultMessage {
  const msgId = `${data.drapeId}:${subject === 'drape.completed' ? 'completed' : 'failed'}`;
  const envelope = {
    specversion: '1.0',
    id: msgId,
    source: SOURCE,
    type: subject,
    subject: data.drapeId,
    time: now.toISOString(),
    datacontenttype: 'application/json',
    data,
  };
  return { subject, msgId, body: new TextEncoder().encode(JSON.stringify(envelope)) };
}

export const completedMessage = (data: DrapeCompleted, now: Date): ResultMessage =>
  resultMessage('drape.completed', data, now);

export const failedMessage = (data: DrapeFailed, now: Date): ResultMessage =>
  resultMessage('drape.failed', data, now);

export const internalFailure = (ids: JobIds): DrapeFailed => ({
  drapeId: ids.drapeId,
  designId: ids.designId,
  versionNumber: ids.versionNumber,
  organizationId: ids.organizationId,
  type: '/problems/drape-internal',
  retryable: false,
});
