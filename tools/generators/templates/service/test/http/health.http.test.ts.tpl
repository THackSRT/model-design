import 'reflect-metadata';
import { createLogger } from '@atelier/service-kit';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { composeApp, configSchema } from '../../src/composition.js';

describe('service __name__', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await composeApp(configSchema.parse({}), createLogger({}, () => undefined));
    await app.listen(0);
  });
  afterAll(() => app.close());

  it('répond à la sonde de santé', async () => {
    const response = await fetch(`${await app.getUrl()}/health`);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
