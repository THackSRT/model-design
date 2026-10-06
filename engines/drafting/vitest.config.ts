import { defineConfig } from 'vitest/config';

// testTimeout : les tests de bornes et de propriétés tracent des centaines de patrons ; sous charge (nx lance les
// projets en parallèle) ils dépassent les 5 s par défaut sans qu'aucun tracé ne soit lent.
// pool « forks » : un processus par fichier ; test/performance.test.ts mesure le temps de processeur du processus, qui
// ne compterait pas que son propre travail si les fichiers partageaient un processus.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], testTimeout: 60000, pool: 'forks' },
});
