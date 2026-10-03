// Règles du monorepo, plus les frontières du moteur : src/core, src/bench, src/mesh et src/placement sont purs (ni
// Node, ni adaptateurs, ni sorties, ni avatar) ; seul src/body importe @atelier/mannequin (ADR 0013).
// Le fichier racine est chargé dynamiquement : la règle de frontières de modules interdit l'import relatif statique.
const { default: root, boundaries } = await import(
  new URL('../../eslint.config.mjs', import.meta.url).href
);

export default [
  ...root,
  {
    // Exception étroite aux contraintes de dépendance entre projets (ADR 0013 : « src/body/ (avatar par
    // @atelier/mannequin, cm → mm ici seulement) ») : l'avatar du drapé est celui du moteur mannequin.
    files: ['src/body/**/*.ts', 'test/**/*.ts'],
    rules: { '@nx/enforce-module-boundaries': boundaries(['@atelier/mannequin']) },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/body/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@atelier/mannequin', '@atelier/mannequin/*'],
              message:
                'Seul src/body importe le moteur mannequin (ADR 0013) : passez par buildAvatar.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/bench/**/*.ts', 'src/mesh/**/*.ts', 'src/placement/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'node:*',
                '**/adapters/**',
                '**/output/**',
                '**/body/**',
                '@atelier/mannequin',
                '@atelier/mannequin/*',
              ],
              message:
                'src/core, src/bench, src/mesh et src/placement sont purs : ni Node, ni adaptateurs, ni sorties, ni avatar.',
            },
          ],
        },
      ],
    },
  },
];
