// Règles du monorepo, plus les frontières du moteur : src/core est pur (ni Node, ni adaptateurs, ni sorties, ni
// FreeSewing, ni contrats) et seul src/adapters importe FreeSewing (ADR 0019).
// Le fichier racine est chargé dynamiquement : la règle de frontières de modules interdit l'import relatif statique.
const { default: root } = await import(new URL('../../eslint.config.mjs', import.meta.url).href);

export default [
  ...root,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', '**/adapters/**', '**/output/**', '@freesewing/*', '@atelier/*'],
              message:
                'src/core est pur : ni Node, ni adaptateurs, ni sorties, ni FreeSewing, ni contrats. Déplacez ce code vers src/adapters/, src/spec/ ou src/node.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/core/**', 'src/adapters/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@freesewing/*'],
              message:
                'Seul src/adapters importe FreeSewing (ADR 0019) : passez par src/adapters/freesewing.',
            },
          ],
        },
      ],
    },
  },
];
