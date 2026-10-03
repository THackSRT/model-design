import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// L'entrée `.` est importée par le studio (navigateur, Worker) : aucun module Node ni moteur mannequin ne doit
// être atteignable par ses imports statiques (sinon Vite les « externalise » et le build avertit).
const SPEC =
  /(?:^|\n)\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

function walk(file: string, seen: Map<string, string>): void {
  const from = seen.get(file);
  if (from !== undefined) return;
  seen.set(file, file);
  const source = readFileSync(file, 'utf8');
  for (const m of source.matchAll(SPEC)) {
    const spec = (m[1] ?? m[2]) as string;
    if (spec.startsWith('.')) {
      const ts = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
      if (!existsSync(ts)) throw new Error(`import introuvable : ${spec} dans ${file}`);
      walk(ts, seen);
    } else seen.set(`${file} -> ${spec}`, spec);
  }
}

describe("entrée '.' compatible navigateur", () => {
  it('n’atteint ni node:* ni @atelier/mannequin', () => {
    const entry = fileURLToPath(new URL('../src/index.ts', import.meta.url));
    const seen = new Map<string, string>();
    walk(entry, seen);
    const files = [...seen.keys()].filter((k) => !k.includes(' -> '));
    expect(files.length).toBeGreaterThan(20);
    const bare = [...seen.entries()].filter(([k]) => k.includes(' -> '));
    const forbidden = bare.filter(
      ([, s]) => s.startsWith('node:') || s.startsWith('@atelier/mannequin'),
    );
    expect(forbidden.map(([k]) => k)).toEqual([]);
  });

  it('le garde-fou voit bien l’entrée Node', () => {
    const seen = new Map<string, string>();
    walk(fileURLToPath(new URL('../src/node.ts', import.meta.url)), seen);
    expect(
      [...seen.values()].some((s) => s.startsWith('node:') || s.startsWith('@atelier/mannequin')),
    ).toBe(true);
  });
});
