// Compile les jetons (tokens/*.tokens.json, format DTCG) avec Style Dictionary.
//   node scripts/build.mjs          écrit dist/ (tokens.css, tokens.js, tokens.d.ts)
//   node scripts/build.mjs --check  vérifie seulement que les jetons se compilent
import { rmSync } from 'node:fs';
import StyleDictionary from 'style-dictionary';

const check = process.argv.includes('--check');
const buildPath = check ? '.check/' : 'dist/';

const sd = new StyleDictionary({
  source: ['tokens/**/*.tokens.json'],
  usesDtcg: true,
  log: { verbosity: 'silent', warnings: 'error' },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath,
      files: [{ destination: 'tokens.css', format: 'css/variables' }],
    },
    js: {
      transformGroup: 'js',
      buildPath,
      files: [
        { destination: 'tokens.js', format: 'javascript/es6' },
        { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
      ],
    },
  },
});

await sd.buildAllPlatforms();
if (check) rmSync('.check', { recursive: true, force: true });
