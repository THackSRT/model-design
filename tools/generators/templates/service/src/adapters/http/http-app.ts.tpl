import type { Logger } from '@atelier/service-kit';
import { ProblemFilter } from '@atelier/service-kit/nest';
import { type INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HealthController } from './health.controller.js';

/** Application HTTP NestJS : NestJS n'apparaît que dans cet adaptateur et dans main.ts. */
export async function createHttpApp(options: { logger: Logger }): Promise<INestApplication> {
  @Module({ controllers: [HealthController] })
  class __Name__HttpModule {}

  const app = await NestFactory.create(__Name__HttpModule, { logger: false });
  app.useGlobalFilters(new ProblemFilter(options.logger));
  app.enableShutdownHooks();
  return app;
}
