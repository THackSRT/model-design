import type {
  Design as DesignBody,
  DesignVersion as DesignVersionBody,
} from '@atelier/contracts-ts';
import type { Design } from '../../domain/design.js';
import type { DesignVersion } from '../../domain/design-version.js';

export const presentDesign = (d: Design): DesignBody => ({
  id: d.id,
  organizationId: d.organizationId,
  name: d.name,
  garmentType: d.garmentType,
  createdAt: d.createdAt.toISOString(),
  latestVersionNumber: d.latestVersionNumber,
});

export const presentVersion = (v: DesignVersion): DesignVersionBody => ({
  designId: v.designId,
  number: v.number,
  createdAt: v.createdAt.toISOString(),
  measurements: v.measurements,
  garment: v.garment,
  fingerprint: v.fingerprint,
  spec: v.spec,
});
