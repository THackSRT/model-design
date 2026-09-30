import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['source'] },
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/**/*.integration.test.ts', 'node_modules/**'],
    // PGlite et NestJS démarrent en quelques secondes quand `pnpm check` charge la machine : 5 s ne suffit pas.
    testTimeout: 20_000,
  },
});
