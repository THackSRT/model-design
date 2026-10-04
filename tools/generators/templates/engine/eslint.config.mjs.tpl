// Règles du monorepo, plus la frontière du moteur : src/core est pur (ni Node, ni adaptateurs, ni sorties).
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
              group: ['node:*', '**/adapters/**', '**/output/**'],
              message:
                'src/core est pur : ni Node, ni adaptateurs, ni sorties. Déplacez ce code vers src/adapters/ ou src/node.ts.',
            },
          ],
        },
      ],
    },
  },
];
