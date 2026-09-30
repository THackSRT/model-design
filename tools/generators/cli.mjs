#!/usr/bin/env node
// pnpm gen service <nom> | engine <nom> | event <entité>.<verbe> [--producer <service>] | screen <app> <écran>
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEngine, generateEvent, generateScreen, generateService } from './generators.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [kind, ...args] = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const commands = {
  service: () => generateService(ROOT, args[0]),
  engine: () => generateEngine(ROOT, args[0]),
  event: () => generateEvent(ROOT, args[0], option('producer')),
  screen: () => generateScreen(ROOT, args[0], args[1]),
};

const run = commands[kind];
if (!run || !args[0]) {
  console.error(
    'Usage : pnpm gen service <nom> | engine <nom> | event <entité>.<verbe> [--producer <service>] | screen <app> <écran>',
  );
  process.exit(1);
}
try {
  const created = run();
  console.log(`Créé :\n${created.map((f) => `  ${f}`).join('\n')}`);
  console.log(
    'Ensuite : pnpm install (ou uv sync --all-packages), pnpm contracts:gen, puis pnpm check.',
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
