import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PathOp, PointMm as CorePointMm } from '../../src/core/types.js';
import * as barrel from '../../src/core/geometry/index.js';
import * as entry from '../../src/geometry.js';
import type { PathOpMm, PointMm } from '../../src/geometry.js';

// L'entrée `./geometry` est importée par `cutting` et `flats` (ADR 0024) : elle ne doit atteindre aucun paquet (ni
// FreeSewing, ni @atelier/*, ni Node) ni aucun fichier de `drafting` hors de `src/core/geometry/`. Même garde-fou que
// test/browser-entry.test.ts, plus la limite de dossier.
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'src');
const GEOMETRY_DIR = join(SRC, 'core', 'geometry');
const ENTRY = join(SRC, 'geometry.ts');

const SPEC =
  /(?:^|\n)\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

const specifiersOf = (source: string): string[] =>
  [...source.matchAll(SPEC)].map((match) => (match[1] ?? match[2]) as string);

const isNodeModule = (spec: string): boolean =>
  spec.startsWith('node:') || builtinModules.includes(spec);

const insideGeometry = (file: string): boolean => {
  const path = relative(GEOMETRY_DIR, file);
  return path !== '' && !path.startsWith('..') && !isAbsolute(path);
};

/** Ce qu'un fichier importe de défendu : un paquet (Node compris), ou un fichier hors de `src/core/geometry/`. */
function importProblems(source: string, importer: string): string[] {
  return specifiersOf(source).flatMap((spec) => {
    if (!spec.startsWith('.')) return [`${isNodeModule(spec) ? 'module Node' : 'paquet'} ${spec}`];
    const target = resolve(dirname(importer), spec.replace(/\.js$/, '.ts'));
    return insideGeometry(target) ? [] : [`fichier hors de src/core/geometry/ : ${spec}`];
  });
}

/** Fichiers atteints par les imports relatifs depuis `file`, avec les défauts trouvés en chemin. */
function reach(file: string, found = { files: new Set<string>(), problems: [] as string[] }) {
  if (found.files.has(file)) return found;
  found.files.add(file);
  const source = readFileSync(file, 'utf8');
  found.problems.push(...importProblems(source, file).map((p) => `${relative(ROOT, file)} : ${p}`));
  for (const spec of specifiersOf(source).filter((s) => s.startsWith('.'))) {
    const target = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
    if (!existsSync(target)) throw new Error(`import introuvable : ${spec} dans ${file}`);
    reach(target, found);
  }
  return found;
}

const sourcesOf = (dir: string): string[] =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.d.ts'))
    .map((name) => join(dir, name));

/** Source sans commentaires : on cherche des appels, pas des mots de la documentation. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const FORBIDDEN =
  /\b(process|Buffer|__dirname|__filename|require|document|window|navigator|localStorage|fetch|setTimeout|setInterval|performance|Date)\b|Math\.(hypot|random|sin|cos|tan|asin|acos|atan2?|sinh|cosh|tanh|exp|log\d*|pow|cbrt)\b|\bimport\s*\(/;

describe("entrée './geometry' : une feuille (ADR 0024)", () => {
  it('n’atteint aucun paquet et aucun fichier hors de src/core/geometry/', () => {
    const { files, problems } = reach(ENTRY);
    expect(problems).toEqual([]);
    expect(files.size).toBeGreaterThan(5);
  });

  it('atteint tous les fichiers de src/core/geometry/ : aucun module orphelin', () => {
    const reached = new Set([...reach(ENTRY).files].map((file) => realpathSync(file)));
    const present = sourcesOf(GEOMETRY_DIR).map((file) => realpathSync(file));
    expect(present.filter((file) => !reached.has(file))).toEqual([]);
  });

  it('le garde-fou reconnaît un paquet, un module Node et un fichier d’un autre dossier', () => {
    const source = [
      "import { draftModel } from '@freesewing/core';",
      "import { type X } from '@atelier/contracts-ts';",
      "export { join } from 'path';",
      "import 'node:os';",
      "export type { PointMm } from '../types.js';",
      'export {',
      '  ok,',
      "} from './ok.js';",
      "export * from '../../index.js';",
    ].join('\n');
    expect(importProblems(source, join(GEOMETRY_DIR, 'any.ts'))).toEqual([
      'paquet @freesewing/core',
      'paquet @atelier/contracts-ts',
      'module Node path',
      'module Node node:os',
      'fichier hors de src/core/geometry/ : ../types.js',
      'fichier hors de src/core/geometry/ : ../../index.js',
    ]);
    expect(importProblems("import { a } from './b.js';", join(GEOMETRY_DIR, 'any.ts'))).toEqual([]);
  });

  it('ne touche ni au système, ni au DOM, ni à l’horloge, ni au hasard, ni à la trigonométrie', () => {
    const files = [ENTRY, ...sourcesOf(GEOMETRY_DIR)];
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const code = withoutComments(readFileSync(file, 'utf8'));
      expect(FORBIDDEN.exec(code)?.[0], relative(ROOT, file)).toBeUndefined();
    }
  });

  it('le garde-fou de pureté reconnaît ce qu’il interdit, et laisse passer le reste', () => {
    const found = (code: string): string | undefined => FORBIDDEN.exec(withoutComments(code))?.[0];
    expect(found('const d = Math.hypot(a, b);')).toBe('Math.hypot');
    expect(found('const r = Math.random();')).toBe('Math.random');
    expect(found('const t = Math.atan2(y, x);')).toBe('Math.atan2');
    expect(found('const t = Math.cos(x);')).toBe('Math.cos');
    expect(found('const home = process.env.HOME;')).toBe('process');
    expect(found('const now = new Date();')).toBe('Date');
    expect(found('const lazy = await import("x");')).toBeDefined();
    expect(found('const text = require("fs");')).toBe('require');
    expect(found('const el = document.body;')).toBe('document');
    expect(
      found('const d = Math.sqrt(x * x + y * y) + Math.max(1, Math.min(2, 3));'),
    ).toBeUndefined();
    expect(
      found('// Math.hypot et process dans un commentaire\n/* Date, document */ const x = 1;'),
    ).toBeUndefined();
  });
});

describe("export './geometry' du paquet", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    exports: Record<string, Record<string, string>>;
  };
  const build = JSON.parse(readFileSync(join(ROOT, 'tsconfig.build.json'), 'utf8')) as {
    compilerOptions: { outDir: string; rootDir: string };
    include: string[];
  };

  it('a les conditions source, types et default, dans cet ordre, comme les entrées . et ./node', () => {
    expect(manifest.exports['./geometry']).toEqual({
      source: './src/geometry.ts',
      types: './dist/geometry.d.ts',
      default: './dist/geometry.js',
    });
    const keys = (name: string): string[] => Object.keys(manifest.exports[name] ?? {});
    expect(keys('./geometry')).toEqual(keys('.'));
    expect(keys('./geometry')).toEqual(keys('./node'));
  });

  it('désigne un fichier source qui existe, et les fichiers que la construction produit', () => {
    expect(existsSync(ENTRY)).toBe(true);
    expect(build.include).toContain('src');
    const emitted = join(
      build.compilerOptions.outDir,
      relative(build.compilerOptions.rootDir, 'src/geometry.ts'),
    );
    const target = (extension: string): string =>
      './' + emitted.replace(/\\/g, '/').replace(/\.ts$/, extension);
    expect(manifest.exports['./geometry']?.default).toBe(target('.js'));
    expect(manifest.exports['./geometry']?.types).toBe(target('.d.ts'));
  });

  it('se résout par le nom du paquet vers le source avec la condition source (comme dans les tests des consommateurs)', () => {
    const resolved = execFileSync(
      process.execPath,
      ['--conditions=source', '-p', "require.resolve('@atelier/drafting/geometry')"],
      { cwd: ROOT, encoding: 'utf8' },
    ).trim();
    expect(realpathSync(resolved)).toBe(realpathSync(ENTRY));
  });
});

describe("API de l'entrée './geometry'", () => {
  it('expose exactement ces valeurs, celles de src/core/geometry/index.ts', () => {
    expect(Object.keys(entry).sort()).toEqual(Object.keys(barrel).sort());
    expect(Object.keys(entry).sort()).toEqual(
      [
        'DEDUPE_TOLERANCE_MM',
        'DEFAULT_CURVE_SEGMENTS',
        'DEFAULT_SMOOTH_SEGMENTS',
        'GeometryError',
        'addPoints',
        'boundaryXMm',
        'boundingBox',
        'crossProduct',
        'dedupePoints',
        'distanceMm',
        'dotProduct',
        'flattenPath',
        'insetPolygon',
        'insetPolygonMiter',
        'intersectSegments',
        'isPointInPolygon',
        'leftNormal',
        'lerpPoint',
        'mirrorPoint',
        'mirrorPoints',
        'nearestPointOnPolyline',
        'normalize',
        'offsetPolyline',
        'outsetPolygonPerEdge',
        'point',
        'pointAt',
        'polygonCrossings',
        'polylineLengthMm',
        'resamplePolyline',
        'reversePoints',
        'rightNormal',
        'sampleCubic',
        'scalePoint',
        'signedAreaMm2',
        'slicePolyline',
        'smoothCatmullRom',
        'splitPolygon',
        'subtractPoints',
        'tangentAt',
      ].sort(),
    );
  });

  it('partage ses types avec l’entrée . : un PointMm et un tracé s’échangent sans conversion', () => {
    const fromCore: CorePointMm = entry.point(1, 2);
    const back: PointMm = fromCore;
    const traced: readonly PathOp[] = [{ type: 'move', to: back }];
    const ops: readonly PathOpMm[] = traced;
    expect(entry.flattenPath(ops)).toEqual([{ xMm: 1, yMm: 2 }]);
  });
});
