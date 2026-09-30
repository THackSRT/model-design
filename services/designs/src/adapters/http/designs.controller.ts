import type { CreateDesignRequest, CreateDesignVersionRequest } from '@atelier/contracts-ts';
import { isUuid } from '@atelier/kernel';
import { contractValidator } from '@atelier/service-kit';
import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import type { DesignsUseCases } from '../../application/use-cases/index.js';
import type { DesignId } from '../../domain/design.js';
import type { OrganizationContext } from './organization-context.js';
import { presentDesign, presentVersion } from './presenters.js';
import { failWith } from './problems.js';
import { ORGANIZATION_CONTEXT, USE_CASES } from './tokens.js';

const validCreateDesign = contractValidator<CreateDesignRequest>('createDesignRequest');
const validCreateVersion = contractValidator<CreateDesignVersionRequest>(
  'createDesignVersionRequest',
);

const designIdOf = (raw: string): DesignId =>
  isUuid(raw) ? (raw as DesignId) : failWith({ kind: 'design-not-found' });

/** Contrôleur mince : valide avec le contrat, appelle un cas d'usage, traduit le résultat. */
@Controller()
export class DesignsController {
  constructor(
    @Inject(USE_CASES) private readonly useCases: DesignsUseCases,
    @Inject(ORGANIZATION_CONTEXT) private readonly organization: OrganizationContext,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post('v1/designs')
  @HttpCode(201)
  async create(@Body() body: unknown) {
    const input = validCreateDesign(body);
    if (input.isErr()) return failWith(input.error);
    const design = await this.useCases.createDesign({
      ...input.value,
      organizationId: this.organization.current(),
    });
    return design.isOk() ? presentDesign(design.value) : failWith(design.error);
  }

  @Get('v1/designs/:designId')
  async get(@Param('designId') designId: string) {
    const design = await this.useCases.getDesign({
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
    });
    return design.isOk() ? presentDesign(design.value) : failWith(design.error);
  }

  @Post('v1/designs/:designId/versions')
  @HttpCode(201)
  async createVersion(@Param('designId') designId: string, @Body() body: unknown) {
    const input = validCreateVersion(body);
    if (input.isErr()) return failWith(input.error);
    const version = await this.useCases.createDesignVersion({
      ...input.value,
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
    });
    return version.isOk() ? presentVersion(version.value) : failWith(version.error);
  }

  @Get('v1/designs/:designId/versions/:number')
  async getVersion(@Param('designId') designId: string, @Param('number') number: string) {
    const version = await this.useCases.getDesignVersion({
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
      number: Number.parseInt(number, 10),
    });
    return version.isOk() ? presentVersion(version.value) : failWith(version.error);
  }
}
