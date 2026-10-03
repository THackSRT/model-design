import type { Logger } from '@atelier/service-kit';
import { ProblemFilter } from '@atelier/service-kit/nest';
import { type INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { DesignsUseCases } from '../../application/use-cases/index.js';
import { DesignsController } from './designs.controller.js';
import { DrapesController } from './drapes.controller.js';
import { FabricationController } from './fabrication.controller.js';
import type { OrganizationContext } from './organization-context.js';
import { ORGANIZATION_CONTEXT, USE_CASES } from './tokens.js';

export interface HttpAppOptions {
  useCases: DesignsUseCases;
  organization: OrganizationContext;
  logger: Logger;
}

/** Application HTTP NestJS : NestJS n'apparaît que dans cet adaptateur et dans main.ts. */
export async function createHttpApp(options: HttpAppOptions): Promise<INestApplication> {
  @Module({
    controllers: [DesignsController, DrapesController, FabricationController],
    providers: [
      { provide: USE_CASES, useValue: options.useCases },
      { provide: ORGANIZATION_CONTEXT, useValue: options.organization },
    ],
  })
  class DesignsHttpModule {}

  const app = await NestFactory.create(DesignsHttpModule, { logger: false });
  app.useGlobalFilters(new ProblemFilter(options.logger));
  return app;
}
