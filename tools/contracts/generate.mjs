#!/usr/bin/env node
// Génère le code des contrats (contracts/) pour TypeScript et Python.
//   pnpm contracts:gen          écrit les fichiers générés
//   pnpm contracts:gen --check  échoue si les fichiers commités ne correspondent plus aux contrats
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileFromFile } from 'json-schema-to-typescript';
import openapiTS, { astToString } from 'openapi-typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACTS = join(ROOT, 'contracts');
const TS_OUT = 'packages/contracts-ts/src/generated';
const PY_OUT = 'py/contracts/src/atelier_contracts/generated';
const BANNER =
  '// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.\n';

const pascal = (name) => name.replace(/(^|[-.])(\w)/g, (_, __, c) => c.toUpperCase());
const camel = (name) => pascal(name).replace(/^\w/, (c) => c.toLowerCase());
const schemaName = (file) => basename(file, '.schema.json');

function listSchemas(dir = join(CONTRACTS, 'schemas')) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listSchemas(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

async function generateSchemaTypes(outRoot) {
  const outDir = join(outRoot, TS_OUT, 'schemas');
  mkdirSync(outDir, { recursive: true });
  const files = listSchemas().sort();
  const exports = [];
  const raw = [];
  for (const file of files) {
    const name = schemaName(file);
    const ts = await compileFromFile(file, {
      bannerComment: BANNER,
      cwd: dirname(file),
      additionalProperties: false,
      style: { singleQuote: true },
    });
    writeFileSync(join(outDir, `${name}.ts`), ts);
    const json = readFileSync(file, 'utf8');
    // Un schéma qui référence un autre fichier recopie ses types : on n'exporte que son type racine.
    const external = /"\$ref":\s*"(?!#)/.test(json);
    const title = JSON.parse(json).title;
    exports.push(
      external
        ? `export type { ${title} } from './${name}.js';`
        : `export type * from './${name}.js';`,
    );
    raw.push(`  ${camel(name)}: ${json.trim().replace(/\n/g, '\n  ')},`);
  }
  writeFileSync(join(outDir, 'index.ts'), `${BANNER}${exports.join('\n')}\n`);
  writeFileSync(
    join(outDir, 'json.ts'),
    `${BANNER}/** Schémas JSON bruts, pour la validation à l'exécution (Ajv). */\nexport const jsonSchemas = {\n${raw.join('\n')}\n} as const;\n`,
  );
}

async function generateOpenApiTypes(outRoot) {
  const outDir = join(outRoot, TS_OUT, 'openapi');
  mkdirSync(outDir, { recursive: true });
  const specs = readdirSync(join(CONTRACTS, 'openapi'))
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  for (const spec of specs) {
    const ast = await openapiTS(pathToFileURL(join(CONTRACTS, 'openapi', spec)));
    writeFileSync(join(outDir, `${basename(spec, '.yaml')}.ts`), BANNER + astToString(ast));
  }
}

function generatePython(outRoot) {
  const outDir = join(outRoot, PY_OUT);
  mkdirSync(outDir, { recursive: true });
  execFileSync(
    'uv',
    [
      'run',
      '--quiet',
      'datamodel-codegen',
      '--input',
      join(CONTRACTS, 'schemas'),
      '--input-file-type',
      'jsonschema',
      '--output',
      outDir,
      '--output-model-type',
      'pydantic_v2.BaseModel',
      '--target-python-version',
      '3.12',
      '--use-standard-collections',
      '--use-union-operator',
      '--field-constraints',
      '--disable-timestamp',
      '--formatters',
      'builtin',
      '--custom-file-header',
      '# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.',
    ],
    { cwd: ROOT, stdio: 'inherit' },
  );
  // Formatage avec la configuration du dépôt, où que soit écrite la sortie (mode --check).
  const ruff = ['run', '--quiet', 'ruff'];
  const config = ['--config', join(ROOT, 'pyproject.toml'), '--no-cache'];
  execFileSync('uv', [...ruff, 'check', ...config, '--select', 'I', '--fix', '--quiet', outDir], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  execFileSync('uv', [...ruff, 'format', ...config, '--quiet', outDir], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.name === '__pycache__') return [];
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function compare(expectedRoot, actualRoot, sub) {
  const expected = listFiles(join(expectedRoot, sub)).map((f) => relative(expectedRoot, f));
  const actual = listFiles(join(actualRoot, sub)).map((f) => relative(actualRoot, f));
  const all = [...new Set([...expected, ...actual])].sort();
  return all.filter((f) => {
    const a = join(expectedRoot, f);
    const b = join(actualRoot, f);
    return !existsSync(a) || !existsSync(b) || readFileSync(a, 'utf8') !== readFileSync(b, 'utf8');
  });
}

async function generate(outRoot) {
  rmSync(join(outRoot, TS_OUT), { recursive: true, force: true });
  rmSync(join(outRoot, PY_OUT), { recursive: true, force: true });
  await generateSchemaTypes(outRoot);
  await generateOpenApiTypes(outRoot);
  generatePython(outRoot);
  // Configuration explicite : en mode --check, la sortie est écrite hors du dépôt.
  // Prettier lancé par Node lui-même : `npx` est un script .cmd sous Windows, introuvable sans shell.
  const prettier = [
    createRequire(import.meta.url).resolve('prettier/bin/prettier.cjs'),
    '--config',
    join(ROOT, '.prettierrc.json'),
    '--ignore-path',
    '',
    '--log-level',
    'warn',
  ];
  execFileSync(process.execPath, [...prettier, '--write', join(outRoot, TS_OUT)], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

if (process.argv.includes('--check')) {
  const tmp = mkdtempSync(join(tmpdir(), 'contracts-'));
  await generate(tmp);
  const stale = [...compare(tmp, ROOT, TS_OUT), ...compare(tmp, ROOT, PY_OUT)];
  rmSync(tmp, { recursive: true, force: true });
  if (stale.length) {
    console.error('Code généré périmé : lancez `pnpm contracts:gen` puis commitez le résultat.');
    for (const f of stale) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('Contrats : code généré à jour.');
} else {
  await generate(ROOT);
  console.log('Contrats : code généré.');
}
