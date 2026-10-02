// Règles du monorepo, plus les frontières du moteur : src/core, src/bench et src/mesh sont purs (ni Node, ni adaptateurs, ni sorties).
// Le fichier racine est chargé dynamiquement : la règle de frontières de modules interdit l'import relatif statique.
const root = (await import(new URL('../../eslint.config.mjs', import.meta.url).href)).default;

export default [
  ...root,
  {
    files: ['src/core/**/*.ts', 'src/bench/**/*.ts', 'src/mesh/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', '**/adapters/**', '**/output/**', '**/body/**'],
              message:
                'src/core, src/bench et src/mesh sont purs : ni Node, ni adaptateurs, ni sorties, ni avatar.',
            },
          ],
        },
      ],
    },
  },
];
