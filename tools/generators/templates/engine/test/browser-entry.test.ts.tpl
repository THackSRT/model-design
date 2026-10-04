import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// L'entrée `.` est importée par le studio (navigateur, Worker) : aucun module Node ne doit être atteignable par ses
// imports statiques (sinon Vite les « externalise » et le build avertit).
const SPEC =
  /(?:^|\n)\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

const isNodeModule = (spec: string): boolean =>
  spec.startsWith('node:') || builtinModules.includes(spec);

const sourceFile = (name: string): string =>
  fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url));

/** Spécificateurs des imports et réexportations statiques d'un source. */
const specifiersOf = (source: string): string[] =>
  [...source.matchAll(SPEC)].map((match) => (match[1] ?? match[2]) as string);

interface Reached {
  files: Set<string>;
  modules: Set<string>;
}

/** Fichiers atteints par les imports relatifs depuis `file`, et modules (nus) qu'ils importent. */
function reach(file: string, found: Reached = { files: new Set(), modules: new Set() }): Reached {
  if (found.files.has(file)) return found;
  found.files.add(file);
  for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
    if (!spec.startsWith('.')) {
      found.modules.add(spec);
      continue;
    }
    const ts = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
    if (!existsSync(ts)) throw new Error(`import introuvable : ${spec} dans ${file}`);
    reach(ts, found);
  }
  return found;
}

describe("entrée '.' compatible navigateur", () => {
  it('n’atteint aucun module Node', () => {
    const { files, modules } = reach(sourceFile('index'));
    expect(files.size).toBeGreaterThan(1);
    expect([...modules].filter(isNodeModule)).toEqual([]);
  });

  it('le garde-fou reconnaît les imports Node', () => {
    const source = [
      "import { readFileSync } from 'node:fs';",
      "export { join } from 'path';",
      "import 'node:os';",
      "import { ok } from './ok.js';",
    ].join('\n');
    expect(specifiersOf(source).filter(isNodeModule)).toEqual(['node:fs', 'path', 'node:os']);
  });
});
