import { defineConfig } from 'vitest/config';

// hookTimeout : les beforeAll chargent l'avatar (0,5 à 1 s seul, plus de 10 s quand nx lance les projets en parallèle).
// Les drapés en qualité standard (`*.standard.test.ts`) ont leur cible : `test-standard`, hors `pnpm check`.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/**/*.standard.test.ts', 'node_modules/**'],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
