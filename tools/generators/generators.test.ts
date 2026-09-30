import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateEngine, generateEvent, generateScreen, generateService } from './generators.mjs';

const REPO = join(import.meta.dirname, '..', '..');

function fakeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'gen-'));
  mkdirSync(join(root, 'contracts/openapi'), { recursive: true });
  mkdirSync(join(root, 'contracts/schemas/events'), { recursive: true });
  mkdirSync(join(root, 'apps/studio'), { recursive: true });
  cpSync(join(REPO, 'contracts/asyncapi'), join(root, 'contracts/asyncapi'), { recursive: true });
  writeFileSync(join(root, 'pyproject.toml'), '[tool.uv.workspace]\nmembers = ["py/contracts"]\n');
  return root;
}

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

  it('crée un moteur Python et l’ajoute à l’espace uv', () => {
    const root = fakeRepo();
    const files = generateEngine(root, 'fabric');
    expect(files).toContain('engines/fabric/src/fabric/main.py');
    expect(readFileSync(join(root, 'pyproject.toml'), 'utf8')).toContain('"engines/fabric"');
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
