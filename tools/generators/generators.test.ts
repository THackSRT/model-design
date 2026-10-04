import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateEngine, generateEvent, generateScreen, generateService } from './generators.mjs';

const REPO = join(import.meta.dirname, '..', '..');

/** Même forme que le pnpm-workspace.yaml du dépôt : la liste des moteurs est explicite. */
const WORKSPACE = `packages:
  - apps/*
  - services/*
  - engines/mannequin
  - engines/drape
  - packages/*
  - tools/*

onlyBuiltDependencies:
  - nx
`;

function fakeRepo(workspace = WORKSPACE): string {
  const root = mkdtempSync(join(tmpdir(), 'gen-'));
  mkdirSync(join(root, 'contracts/openapi'), { recursive: true });
  mkdirSync(join(root, 'contracts/schemas/events'), { recursive: true });
  mkdirSync(join(root, 'apps/studio'), { recursive: true });
  cpSync(join(REPO, 'contracts/asyncapi'), join(root, 'contracts/asyncapi'), { recursive: true });
  writeFileSync(join(root, 'pnpm-workspace.yaml'), workspace);
  return root;
}

const read = (root: string, file: string) => readFileSync(join(root, file), 'utf8');

const noPlaceholder = (root: string, files: string[]) =>
  files.filter((f) => f.includes('(')).length === 0 &&
  files.every((f) => !readFileSync(join(root, f), 'utf8').includes('__name') && !f.includes('__'));

describe('générateurs', () => {
  it('crée un service en quatre couches et son contrat', () => {
    const root = fakeRepo();
    const files = generateService(root, 'supplier-stock');
    expect(files).toContain('services/supplier-stock/src/composition.ts');
    expect(files).toContain('contracts/openapi/supplier-stock.yaml');
    expect(noPlaceholder(root, files)).toBe(true);
    expect(
      readFileSync(
        join(root, 'services/supplier-stock/src/application/use-cases/index.ts'),
        'utf8',
      ),
    ).toContain('export function supplierStockUseCases');
  });

  it('ajoute un événement au contrat AsyncAPI', () => {
    const root = fakeRepo();
    generateEvent(root, 'stock.reserved', 'supplier-stock');
    const asyncapi = readFileSync(join(root, 'contracts/asyncapi/events.yaml'), 'utf8');
    expect(asyncapi).toContain('address: stock.reserved');
    expect(asyncapi).toContain('x-producer: supplier-stock');
  });

  it('crée un écran et son modèle de vue', () => {
    const root = fakeRepo();
    const files = generateScreen(root, 'studio', 'fabric-picker');
    expect(files).toContain('apps/studio/src/screens/fabric-picker/view.tsx');
    expect(files).toContain('packages/features/src/fabric-picker/use-fabric-picker.ts');
  });

  it('refuse un nom mal formé ou déjà pris', () => {
    const root = fakeRepo();
    expect(() => generateService(root, 'Supplier_Stock')).toThrow(/kebab-case/);
    generateService(root, 'orders');
    expect(() => generateService(root, 'orders')).toThrow(/existe déjà/);
  });
});

describe('générateur de moteur (TypeScript, modèle engines/drape)', () => {
  it('crée les fichiers du moteur, sans Dockerfile ni Python', () => {
    const root = fakeRepo();
    const files = generateEngine(root, 'fabric-cut');
    const created = files.filter((f) => !f.includes('('));
    expect([...created].sort()).toEqual([
      'engines/fabric-cut/AGENTS.md',
      'engines/fabric-cut/eslint.config.mjs',
      'engines/fabric-cut/package.json',
      'engines/fabric-cut/src/core/example.ts',
      'engines/fabric-cut/src/index.ts',
      'engines/fabric-cut/src/node.ts',
      'engines/fabric-cut/src/version.ts',
      'engines/fabric-cut/test/browser-entry.test.ts',
      'engines/fabric-cut/test/example.test.ts',
      'engines/fabric-cut/tsconfig.build.json',
      'engines/fabric-cut/tsconfig.json',
      'engines/fabric-cut/vitest.config.ts',
    ]);
    expect(files).toContain('pnpm-workspace.yaml (moteur inscrit)');
    expect(noPlaceholder(root, created)).toBe(true);
  });

  it('remplace le nom du moteur dans le paquet, la documentation et les entrées', () => {
    const root = fakeRepo();
    generateEngine(root, 'fabric-cut');
    const pkg = JSON.parse(read(root, 'engines/fabric-cut/package.json')) as { exports: object };
    expect(pkg).toMatchObject({
      name: '@atelier/fabric-cut',
      private: true,
      type: 'module',
      exports: {
        '.': { source: './src/index.ts', default: './dist/index.js' },
        './node': { source: './src/node.ts', default: './dist/node.js' },
      },
      scripts: {
        build: 'tsc -p tsconfig.build.json',
        typecheck: 'tsc -p tsconfig.json --noEmit',
        lint: 'eslint .',
        test: 'vitest run',
      },
      nx: { tags: ['type:engine'] },
    });
    expect(Object.keys(pkg.exports)).toEqual(['.', './node']);
    expect(read(root, 'engines/fabric-cut/AGENTS.md')).toContain(
      '# Moteur fabric-cut (TypeScript)',
    );
    expect(read(root, 'engines/fabric-cut/AGENTS.md')).toContain(
      'pnpm nx run @atelier/fabric-cut:lint',
    );
    expect(read(root, 'engines/fabric-cut/src/node.ts')).toContain('@atelier/fabric-cut/node');
    expect(read(root, 'engines/fabric-cut/test/example.test.ts')).toContain(
      "describe('moteur fabric-cut'",
    );
  });

  it('versionne le moteur et garde son cœur pur', () => {
    const root = fakeRepo();
    generateEngine(root, 'fabric-cut');
    expect(read(root, 'engines/fabric-cut/src/version.ts')).toContain(
      "export const ENGINE_VERSION = '0.1.0';",
    );
    expect(read(root, 'engines/fabric-cut/src/index.ts')).toContain(
      "export { ENGINE_VERSION } from './version.js';",
    );
    const lint = read(root, 'engines/fabric-cut/eslint.config.mjs');
    expect(lint).toContain("files: ['src/core/**/*.ts']");
    expect(lint).toContain("group: ['node:*', '**/adapters/**', '**/output/**']");
  });

  it('inscrit le moteur dans pnpm-workspace.yaml, après les autres moteurs', () => {
    const root = fakeRepo();
    generateEngine(root, 'fabric-cut');
    expect(read(root, 'pnpm-workspace.yaml')).toBe(
      WORKSPACE.replace('  - engines/drape\n', '  - engines/drape\n  - engines/fabric-cut\n'),
    );
  });

  it('inscrit le moteur à la fin de la liste quand elle n’en a pas encore', () => {
    const root = fakeRepo('packages:\n  - apps/*\n  - packages/*\n\nignored:\n  - x\n');
    generateEngine(root, 'fabric-cut');
    expect(read(root, 'pnpm-workspace.yaml')).toBe(
      'packages:\n  - apps/*\n  - packages/*\n  - engines/fabric-cut\n\nignored:\n  - x\n',
    );
  });

  it('reprend l’indentation de la liste', () => {
    const root = fakeRepo('packages:\n    - apps/*\n    - engines/drape\n');
    generateEngine(root, 'fabric-cut');
    expect(read(root, 'pnpm-workspace.yaml')).toBe(
      'packages:\n    - apps/*\n    - engines/drape\n    - engines/fabric-cut\n',
    );
  });

  it('garde les fins de ligne CRLF du fichier', () => {
    const root = fakeRepo(WORKSPACE.replaceAll('\n', '\r\n'));
    generateEngine(root, 'fabric-cut');
    const text = read(root, 'pnpm-workspace.yaml');
    expect(text).toContain('  - engines/drape\r\n  - engines/fabric-cut\r\n  - packages/*\r\n');
    expect(text.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it.each([
    ['la même entrée', 'packages:\n  - engines/fabric-cut\n  - tools/*\n'],
    ['la même entrée entre guillemets', "packages:\n  - 'engines/fabric-cut'\n  - tools/*\n"],
    ['le motif engines/*', 'packages:\n  - engines/*\n  - tools/*\n'],
  ])('ne duplique pas l’inscription : %s', (_, workspace) => {
    const root = fakeRepo(workspace);
    const files = generateEngine(root, 'fabric-cut');
    expect(read(root, 'pnpm-workspace.yaml')).toBe(workspace);
    expect(files).toContain('engines/fabric-cut/package.json');
    expect(files.filter((f) => f.includes('('))).toEqual([]);
  });

  it('sait inscrire un moteur dans le pnpm-workspace.yaml du dépôt', () => {
    const root = fakeRepo(readFileSync(join(REPO, 'pnpm-workspace.yaml'), 'utf8'));
    generateEngine(root, 'essai-reel');
    expect(read(root, 'pnpm-workspace.yaml')).toMatch(/^ {2}- engines\/(essai-reel|\*)\r?$/m);
  });

  it.each([
    ['absente', 'onlyBuiltDependencies:\n  - nx\n'],
    ['vide', 'packages:\n\nonlyBuiltDependencies:\n  - nx\n'],
  ])('ne crée rien quand la liste des paquets est %s', (_, workspace) => {
    const root = fakeRepo(workspace);
    expect(() => generateEngine(root, 'fabric-cut')).toThrow(/packages/);
    expect(existsSync(join(root, 'engines'))).toBe(false);
    expect(read(root, 'pnpm-workspace.yaml')).toBe(workspace);
  });

  it('refuse un nom mal formé ou déjà pris, sans doubler l’inscription', () => {
    const root = fakeRepo();
    expect(() => generateEngine(root, 'Fabric_Cut')).toThrow(/kebab-case/);
    expect(read(root, 'pnpm-workspace.yaml')).toBe(WORKSPACE);
    generateEngine(root, 'fabric-cut');
    expect(() => generateEngine(root, 'fabric-cut')).toThrow(/existe déjà/);
    expect(read(root, 'pnpm-workspace.yaml').match(/engines\/fabric-cut/g)).toHaveLength(1);
  });
});
