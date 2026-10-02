import type {
  DesignVersioned,
  GarmentRequest,
  GarmentSpec,
  MeasurementSet,
} from '@atelier/contracts-ts';
import { type DomainEvent, err, ok, type Result } from '@atelier/kernel';
import type { Design, DesignError, DesignId } from './design.js';

/** Une version figée : mêmes mesures et paramètres, même empreinte, même patron. */
export interface DesignVersion {
  readonly designId: DesignId;
  readonly number: number;
  readonly createdAt: Date;
  readonly measurements: MeasurementSet;
  readonly garment: GarmentRequest;
  readonly fingerprint: string;
  readonly spec: GarmentSpec;
}

export interface VersionDraft {
  measurements: MeasurementSet;
  garment: GarmentRequest;
  spec: GarmentSpec;
  fingerprint: string;
  now: Date;
}

export interface VersionAdded {
  design: Design;
  version: DesignVersion;
  events: DomainEvent<DesignVersioned>[];
}

export function addVersion(design: Design, draft: VersionDraft): Result<VersionAdded, DesignError> {
  if (draft.garment.type !== design.garmentType || draft.spec.garment.type !== design.garmentType) {
    return err({
      kind: 'garment-type-mismatch',
      detail: `Ce modèle est de type ${design.garmentType}, pas ${draft.garment.type}.`,
    });
  }
  const number = design.latestVersionNumber + 1;
  const version: DesignVersion = {
    designId: design.id,
    number,
    createdAt: draft.now,
    measurements: draft.measurements,
    garment: draft.garment,
    fingerprint: draft.fingerprint,
    spec: draft.spec,
  };
  const event: DomainEvent<DesignVersioned> = {
    type: 'design.versioned',
    subject: design.id,
    data: {
      designId: design.id,
      versionNumber: number,
      organizationId: design.organizationId,
      fingerprint: draft.fingerprint,
      engineVersion: draft.spec.engine.version,
    },
  };
  return ok({ design: { ...design, latestVersionNumber: number }, version, events: [event] });
}

/** Résumé d'une version pour une liste : ni mesures du client ni patron. */
export interface VersionSummary {
  readonly number: number;
  readonly createdAt: Date;
  readonly fingerprint: string;
  readonly engineVersion: string;
  readonly garment: GarmentRequest;
}

export const summaryOf = (v: DesignVersion): VersionSummary => ({
  number: v.number,
  createdAt: v.createdAt,
  fingerprint: v.fingerprint,
  engineVersion: v.spec.engine.version,
  garment: v.garment,
});
