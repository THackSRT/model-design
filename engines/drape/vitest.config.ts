import { defineConfig } from 'vitest/config';

// hookTimeout : les beforeAll chargent l'avatar (0,5 à 1 s seul, plus de 10 s quand nx lance les projets en parallèle).
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], testTimeout: 120000, hookTimeout: 120000 },
});
