import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, FREESEWING_VERSION } from '../src/index.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SPEC =
  /(?:^|\n)\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

const sourcesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourcesIn(path);
    return path.endsWith('.ts') && !path.endsWith('.d.ts') ? [path] : [];
  });

/** Spécificateurs importés par un source, avec le fichier qui les importe. */
const importsOf = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(SPEC)].map((match) => (match[1] ?? match[2]) as string);

const inside = (folder: string): string[] => sourcesIn(join(ROOT, 'src', folder));
const insideSrcOutside = (...folders: string[]): string[] =>
  sourcesIn(join(ROOT, 'src')).filter(
    (file) => !folders.some((folder) => relative(join(ROOT, 'src'), file).startsWith(`${folder}/`)),
  );

const isNodeModule = (spec: string): boolean =>
  spec.startsWith('node:') || builtinModules.includes(spec);

const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  files: string[];
};

describe('frontières du moteur (ADR 0019, 0021)', () => {
  it('seul src/adapters importe FreeSewing', () => {
    const importers = insideSrcOutside('adapters').filter((file) =>
      importsOf(file).some((spec) => spec.startsWith('@freesewing/')),
    );
    expect(importers).toEqual([]);
    const adapters = inside('adapters').filter((file) =>
      importsOf(file).some((spec) => spec.startsWith('@freesewing/')),
    );
    expect(adapters.length).toBeGreaterThan(0);
  });

  it('src/core est pur : il n’importe que ses voisins (ni FreeSewing, ni contrats, ni Node)', () => {
    const files = inside('core');
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      for (const spec of importsOf(file)) {
        expect(spec, `${relative(ROOT, file)} importe ${spec}`).toMatch(/^\.\/[a-z-]+\.js$/);
        expect(isNodeModule(spec)).toBe(false);
      }
    }
  });

  it('aucun fichier de src, hors src/node.ts, n’importe un module Node', () => {
    const files = insideSrcOutside().filter((file) => !file.endsWith(join('src', 'node.ts')));
    for (const file of files) {
      expect(importsOf(file).filter(isNodeModule), relative(ROOT, file)).toEqual([]);
    }
  });

  it('les entrées sont minces : index.ts réexporte, node.ts réexporte l’entrée .', () => {
    expect(readFileSync(join(ROOT, 'src', 'node.ts'), 'utf8')).toContain(
      "export * from './index.js';",
    );
  });
});

describe('FreeSewing épinglé (ADR 0019)', () => {
  const require = createRequire(import.meta.url);

  /** Version d'un paquet installé : son `package.json`, à la racine du paquet que `require.resolve` désigne. */
  function installedVersion(name: string): string {
    const entry = require.resolve(name);
    const root = new RegExp(`^(.*[\\\\/]${name.replace('/', '[\\\\/]')})[\\\\/]`).exec(entry)?.[1];
    expect(root, `racine du paquet ${name} introuvable depuis ${entry}`).toBeDefined();
    const manifest = JSON.parse(readFileSync(join(root as string, 'package.json'), 'utf8')) as {
      version: string;
    };
    return manifest.version;
  }

  it('déclare chaque paquet @freesewing/* en version exacte, sans ^ ni ~', () => {
    const declared = Object.entries(packageJson.dependencies).filter(([name]) =>
      name.startsWith('@freesewing/'),
    );
    expect(declared.map(([name]) => name).sort()).toEqual([
      '@freesewing/brian',
      '@freesewing/core',
      '@freesewing/models',
    ]);
    for (const [, version] of declared) expect(version).toBe(FREESEWING_VERSION);
  });

  it('installe la version que le moteur annonce', () => {
    for (const name of ['@freesewing/core', '@freesewing/brian', '@freesewing/models']) {
      expect(installedVersion(name)).toBe(FREESEWING_VERSION);
    }
  });

  it('porte une version de moteur de la forme x.y.z', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('avis de licence de FreeSewing', () => {
  const notice = readFileSync(join(ROOT, 'NOTICE-FREESEWING.md'), 'utf8');

  it('est livré avec le moteur (champ files de package.json)', () => {
    expect(packageJson.files).toContain('NOTICE-FREESEWING.md');
    expect(existsSync(resolve(ROOT, 'NOTICE-FREESEWING.md'))).toBe(true);
  });

  it('porte le copyright et le texte de la licence MIT tels que FreeSewing les publie', () => {
    expect(notice).toContain('Copyright (c) Joost De Cock');
    expect(notice).toContain('Permission is hereby granted, free of charge');
    expect(notice).toContain(
      'The above copyright notice and this permission notice shall be included',
    );
    expect(notice).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
    expect(notice).toContain(`FreeSewing ${FREESEWING_VERSION}`);
  });

  it('cite chaque paquet @freesewing/* installé avec le moteur', () => {
    for (const name of [
      'core',
      'brian',
      'library',
      'models',
      'config',
      'core-plugins',
      'plugin-annotations',
      'plugin-bust',
      'plugin-transform',
    ]) {
      expect(notice).toContain(`@freesewing/${name}`);
    }
  });
});
