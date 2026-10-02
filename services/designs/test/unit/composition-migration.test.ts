import 'reflect-metadata';
import { createLogger } from '@atelier/service-kit';
import { describe, expect, it } from 'vitest';
import { composeService, configSchema } from '../../src/composition.js';

const logger = createLogger({}, () => undefined);

describe('composition : connexions à la base', () => {
  it('accepte DATABASE_URL (service) et MIGRATION_DATABASE_URL (propriétaire) distinctes', () => {
    const config = configSchema.parse({
      DATABASE_URL: 'postgres://designs_app:x@db:5432/designs',
      MIGRATION_DATABASE_URL: 'postgres://owner:y@db:5432/designs',
      MIGRATE_ON_START: 'true',
    });
    expect(config.DATABASE_URL).toContain('designs_app');
    expect(config.MIGRATION_DATABASE_URL).toContain('owner');
  });

  it('refuse de démarrer avec MIGRATE_ON_START sans MIGRATION_DATABASE_URL', async () => {
    const config = configSchema.parse({
      DATABASE_URL: 'postgres://designs_app:x@db:5432/designs',
      MIGRATE_ON_START: 'true',
    });
    await expect(composeService(config, logger)).rejects.toThrow(/MIGRATION_DATABASE_URL/);
  });
});
