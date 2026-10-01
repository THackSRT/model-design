import { err, ok, type Result } from '@atelier/kernel';
import type { DesignId, OrganizationId } from '../../domain/design.js';
import { type ExportFileFormat, exportFileName } from '../../domain/export-file-name.js';
import type { DesignRepository } from '../ports/design-repository.js';
import type {
  ExportOptionsInput,
  ManufacturingEngine,
  ManufacturingFailure,
} from '../ports/manufacturing-engine.js';
import { findVersion } from './find-version.js';
import type { NotFound } from './get-design.js';

export interface ExportedFile {
  bytes: Uint8Array;
  format: ExportFileFormat;
  fileName: string;
}

export const exportVersion =
  (deps: { designs: DesignRepository; manufacturing: ManufacturingEngine }) =>
  async (
    input: {
      organizationId: OrganizationId;
      designId: DesignId;
      number: number;
    } & ExportOptionsInput,
  ): Promise<Result<ExportedFile, NotFound | ManufacturingFailure>> => {
    const { organizationId, designId, number, ...request } = input;
    const version = await findVersion(deps.designs, { organizationId, designId, number });
    if (version.isErr()) return err(version.error);
    const file = await deps.manufacturing.exportFile(version.value.spec, request);
    if (file.isErr()) return err(file.error);
    return ok({
      bytes: file.value,
      format: request.format,
      fileName: exportFileName({
        garmentType: version.value.garment.type,
        versionNumber: number,
        sizeLabel: request.sizeLabel,
        format: request.format,
      }),
    });
  };
