// Règles vérifiables des directives de codage (voir AGENTS.md). Un message d'erreur dit quoi faire.
import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FRAMEWORKS = [
  '@nestjs/*',
  'drizzle-orm',
  'drizzle-orm/*',
  'pg',
  'nats',
  '@atelier/service-kit',
];

export default tseslint.config(
  {
    ignores: [
      'prototype/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/node_modules/**',
      '.venv/**',
      '.nx/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: { '@nx': nx },
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Les modules NestJS sont des classes vides décorées.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            { sourceTag: 'type:kernel', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'type:contracts', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'type:tokens', onlyDependOnLibsWithTags: [] },
            {
              sourceTag: 'type:service-kit',
              onlyDependOnLibsWithTags: ['type:kernel', 'type:contracts'],
            },
            {
              sourceTag: 'type:service',
              onlyDependOnLibsWithTags: ['type:kernel', 'type:service-kit', 'type:contracts'],
            },
            {
              sourceTag: 'type:engine',
              onlyDependOnLibsWithTags: ['type:kernel', 'type:contracts'],
            },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:tokens'] },
            { sourceTag: 'type:viewer', onlyDependOnLibsWithTags: ['type:kernel'] },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:kernel', 'type:contracts', 'type:engine'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:tokens',
                'type:contracts',
                'type:viewer',
                'type:kernel',
                'type:engine',
              ],
            },
            { sourceTag: 'type:tool', onlyDependOnLibsWithTags: ['*'] },
          ],
        },
      ],
    },
  },
  {
    files: ['services/*/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**', '**/adapters/**'],
              message:
                'Le domaine ne dépend de rien : déplacez ce code vers la couche application ou adapters.',
            },
            {
              group: FRAMEWORKS,
              message:
                'Le domaine n’importe aucun framework : passez par un port déclaré dans application/ports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['services/*/src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/adapters/**'],
              message:
                'Un cas d’usage ne connaît que des ports : déclarez une interface dans application/ports.',
            },
            {
              group: FRAMEWORKS,
              message:
                'La couche application ne connaît ni HTTP, ni SQL, ni NATS, ni NestJS : passez par un port.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/features/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react-dom', 'react-dom/*', 'react-native', '@atelier/ui-*'],
              message:
                'Un modèle de vue est partagé web et mobile : ni DOM, ni React Native, ni composant visuel.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui-*/**/*.{ts,tsx}', 'apps/*/src/screens/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message:
            'Pas de couleur en dur : utilisez un jeton de @atelier/design-tokens (var(--…)).',
        },
        {
          selector: 'Literal[value=/^\\d+px$/]',
          message: 'Pas de taille en dur : utilisez un jeton d’espacement ou de typographie.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Un composant n’appelle pas le réseau : passez par un modèle de vue.',
        },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off' },
  },
);
