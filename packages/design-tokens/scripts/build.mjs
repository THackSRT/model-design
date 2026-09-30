// Compile les jetons (tokens/*.tokens.json, format DTCG) avec Style Dictionary.
//   node scripts/build.mjs          écrit dist/ (tokens.css, tokens.js, tokens.d.ts)
//   node scripts/build.mjs --check  vérifie seulement que les jetons se compilent
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import StyleDictionary from 'style-dictionary';

const check = process.argv.includes('--check');
// En vérification, un dossier propre à chaque exécution : `test` et `typecheck` tournent en parallèle.
const checkDir = check ? mkdtempSync(join(tmpdir(), 'design-tokens-')) : undefined;
const buildPath = checkDir ? `${checkDir}/` : 'dist/';

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

try {
  await sd.buildAllPlatforms();
} finally {
  if (checkDir) rmSync(checkDir, { recursive: true, force: true });
}
