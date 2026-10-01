import type { CutPatternOptions, DesignExportRequest } from '@atelier/contracts-ts';
import { isUuid } from '@atelier/kernel';
import { contractValidator } from '@atelier/service-kit';
import {
  Body,
  Controller,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import type { DesignsUseCases } from '../../application/use-cases/index.js';
import type { DesignId } from '../../domain/design.js';
import type { ExportFileFormat } from '../../domain/export-file-name.js';
import type { OrganizationContext } from './organization-context.js';
import { failWith } from './problems.js';
import { ORGANIZATION_CONTEXT, USE_CASES } from './tokens.js';

const validOptions = contractValidator<CutPatternOptions>('cutPatternOptions');
const validExport = contractValidator<DesignExportRequest>('designExportRequest');

const CONTENT_TYPE: Record<ExportFileFormat, string> = {
  svg: 'image/svg+xml',
  'pdf-a4-tiled': 'application/pdf',
  'dxf-aama': 'image/vnd.dxf',
};

const designIdOf = (raw: string): DesignId =>
  isUuid(raw) ? (raw as DesignId) : failWith({ kind: 'design-not-found' });

const versionNumberOf = (raw: string): number =>
  /^[1-9]\d{0,8}$/.test(raw) ? Number(raw) : failWith({ kind: 'version-not-found' });

/** Pièces de coupe et exports d'une version : calculés par le moteur de fabrication, jamais mis en cache. */
@Controller('v1/designs/:designId/versions/:number')
export class FabricationController {
  constructor(
    @Inject(USE_CASES) private readonly useCases: DesignsUseCases,
    @Inject(ORGANIZATION_CONTEXT) private readonly organization: OrganizationContext,
  ) {}

  @Post('cut-patterns')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async cutPatterns(
    @Param('designId') designId: string,
    @Param('number') number: string,
    @Body() body: unknown,
  ) {
    const options = validOptions(body);
    if (options.isErr()) return failWith(options.error);
    const pattern = await this.useCases.getVersionCutPattern({
      ...options.value,
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
      number: versionNumberOf(number),
    });
    return pattern.isOk() ? pattern.value : failWith(pattern.error);
  }

  @Post('exports')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async exports(
    @Param('designId') designId: string,
    @Param('number') number: string,
    @Body() body: unknown,
  ) {
    const request = validExport(body);
    if (request.isErr()) return failWith(request.error);
    const file = await this.useCases.exportVersion({
      ...request.value,
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
      number: versionNumberOf(number),
    });
    if (file.isErr()) return failWith(file.error);
    return new StreamableFile(file.value.bytes, {
      type: CONTENT_TYPE[file.value.format],
      disposition: `attachment; filename="${file.value.fileName}"`,
    });
  }
}
