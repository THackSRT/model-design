import { defineConfig } from 'vitest/config';

// Cible `test-standard` : drapés en qualité standard, hors `pnpm check`. Un fichier à la fois et un seul fil, pour que
// le temps réel d'un drapé (borne de 60 s) ne soit pas gonflé par les autres processus du projet.
export default defineConfig({
  test: {
    include: ['test/**/*.standard.test.ts'],
    testTimeout: 600000,
    hookTimeout: 600000,
    fileParallelism: false,
  },
});
