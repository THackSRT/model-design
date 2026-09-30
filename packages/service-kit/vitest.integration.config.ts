import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['source'] },
  test: { include: ['src/**/*.integration.test.ts'], testTimeout: 15_000 },
});
