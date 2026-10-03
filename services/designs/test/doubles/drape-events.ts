import type { CloudEventEnvelope, DrapeCompleted, DrapeFailed } from '@atelier/contracts-ts';
import type { ConsumedMessage } from '@atelier/service-kit/nats';
import { NOW, ORG } from '../builders.js';

export const MODEL_SHA = 'b'.repeat(64);
export const modelKeyOf = (organizationId: string = ORG) =>
  `drapes/${organizationId}/${MODEL_SHA}.glb`;

export interface EventTarget {
  drapeId: string;
  designId: string;
  versionNumber?: number;
  organizationId?: string;
}

export const completedData = (target: EventTarget): DrapeCompleted => ({
  drapeId: target.drapeId,
  designId: target.designId,
  versionNumber: target.versionNumber ?? 1,
  organizationId: target.organizationId ?? ORG,
  result: {
    modelKey: modelKeyOf(target.organizationId),
    sizeBytes: 5,
    sha256: MODEL_SHA,
    ease: { minMm: 2, medianMm: 18, maxMm: 60, tightAreaMm2: 1200 },
    maxStrainPercent: 4.5,
    fabricEstimated: true,
    engineVersion: '0.1.0',
    vertexCount: 900,
    simulatedSteps: 400,
    converged: true,
  },
});

export const failedData = (target: EventTarget): DrapeFailed => ({
  drapeId: target.drapeId,
  designId: target.designId,
  versionNumber: target.versionNumber ?? 1,
  organizationId: target.organizationId ?? ORG,
  type: '/problems/drape-seam-not-closed',
  retryable: false,
});

export const envelope = (type: string, data: object): CloudEventEnvelope => ({
  specversion: '1.0',
  id: '01920000-0000-7000-8000-0000000000e1',
  source: '/engines/drape',
  type,
  subject: 'x',
  time: NOW,
  datacontenttype: 'application/json',
  data: { ...data },
});

export const message = (type: string, payload: unknown): ConsumedMessage => ({
  subject: type,
  data: new TextEncoder().encode(typeof payload === 'string' ? payload : JSON.stringify(payload)),
});
