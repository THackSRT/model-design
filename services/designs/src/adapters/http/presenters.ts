import type {
  Design as DesignBody,
  DesignVersion as DesignVersionBody,
  DesignVersionChanges,
  DesignVersionPage,
  DesignVersionSummary,
} from '@atelier/contracts-ts';
import type { VersionComparison } from '../../application/use-cases/get-version-changes.js';
import type { VersionPage } from '../../application/use-cases/list-design-versions.js';
import type { Design, DesignId } from '../../domain/design.js';
import type { DesignVersion, VersionSummary } from '../../domain/design-version.js';

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

export const presentSummary = (v: VersionSummary): DesignVersionSummary => ({
  number: v.number,
  createdAt: v.createdAt.toISOString(),
  fingerprint: v.fingerprint,
  engineVersion: v.engineVersion,
  garment: v.garment,
});

export const presentVersionPage = (
  designId: DesignId,
  page: VersionPage,
  nextCursor: string | undefined,
): DesignVersionPage => ({
  designId,
  items: page.items.map(presentSummary),
  ...(nextCursor === undefined ? {} : { nextCursor }),
});

export const presentChanges = (designId: DesignId, c: VersionComparison): DesignVersionChanges => ({
  designId,
  from: presentSummary(c.from),
  to: presentSummary(c.to),
  sameFingerprint: c.sameFingerprint,
  params: c.params,
  measurements: c.measurements,
});
