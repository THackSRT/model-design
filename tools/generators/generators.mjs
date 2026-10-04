// Gabarits copiés avec remplacement des noms. Chaque générateur rend la liste des fichiers créés.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), 'templates');
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const pascal = (kebab) => kebab.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
/** Chemin relatif en séparateurs `/` : il finit dans des contrats et des messages, quel que soit le poste. */
const relativePosix = (from, to) => relative(from, to).split(sep).join('/');

function assertName(name, what) {
  if (!name || !KEBAB.test(name))
    throw new Error(`${what} : nom en kebab-case attendu (ex. supplier-stock), reçu « ${name} ».`);
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/** Copie un gabarit et remplace les noms (__name__, __Name__, __nameCamel__). */
function instantiate(root, template, target, name) {
  const camel = pascal(name).replace(/^\w/, (c) => c.toLowerCase());
  const vars = {
    __nameCamel__: camel,
    __Name__: pascal(name),
    __name__: name,
  };
  const replace = (text) => Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), text);
  const files = listFiles(join(TEMPLATES, template)).map((file) => ({
    file,
    out: join(
      root,
      target,
      replace(relative(join(TEMPLATES, template), file)).replace(/\.tpl$/, ''),
    ),
  }));
  const taken = files.find(({ out }) => existsSync(out));
  if (taken) throw new Error(`${relative(root, taken.out)} existe déjà.`);
  for (const { file, out } of files) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, replace(readFileSync(file, 'utf8')));
  }
  return files.map(({ out }) => relativePosix(root, out));
}

export function generateService(root, name) {
  assertName(name, 'service');
  const created = instantiate(root, 'service', `services/${name}`, name);
  return [...created, ...instantiate(root, 'service-contract', 'contracts/openapi', name)];
}

const LIST_ITEM = /^(\s*)-\s+(.*?)\s*$/;

/** Première ligne, indentation et entrées (sans guillemets) de la liste qui suit `packages:`. */
function packageEntries(lines) {
  const head = lines.findIndex((line) => /^packages:\s*$/.test(line));
  const tail = head < 0 ? [] : lines.slice(head + 1);
  const end = tail.findIndex((line) => !LIST_ITEM.test(line));
  const matches = (end < 0 ? tail : tail.slice(0, end)).map((line) => LIST_ITEM.exec(line));
  if (matches.length === 0)
    throw new Error('pnpm-workspace.yaml : liste « packages: » introuvable ou vide.');
  const unquote = (item) => item.replace(/^(['"])(.*)\1$/, '$2');
  return { first: head + 1, indent: matches[0][1], items: matches.map((m) => unquote(m[2])) };
}

/**
 * Ajoute `engines/<nom>` à la liste `packages:` de pnpm-workspace.yaml, après le dernier moteur déjà listé : la
 * liste des moteurs est explicite, car des moteurs Python vivent aussi sous `engines/`. Rend le texte tel quel si
 * le moteur est déjà couvert (même entrée, ou `engines/*`).
 */
function registerEngine(text, name) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const { first, indent, items } = packageEntries(lines);
  if (items.includes(`engines/${name}`) || items.includes('engines/*')) return text;
  const lastEngine = items.findLastIndex((item) => item.startsWith('engines/'));
  const at = first + (lastEngine < 0 ? items.length : lastEngine + 1);
  lines.splice(at, 0, `${indent}- engines/${name}`);
  return lines.join(eol);
}

/** Moteur TypeScript sur le modèle de engines/drape (ADR 0021), inscrit à l'espace de travail pnpm. */
export function generateEngine(root, name) {
  assertName(name, 'moteur');
  const workspace = join(root, 'pnpm-workspace.yaml');
  const text = readFileSync(workspace, 'utf8');
  // Calculé avant toute écriture : un espace de travail inexploitable ne laisse rien derrière lui.
  const registered = registerEngine(text, name);
  const created = instantiate(root, 'engine', `engines/${name}`, name);
  if (registered === text) return created;
  writeFileSync(workspace, registered);
  return [...created, 'pnpm-workspace.yaml (moteur inscrit)'];
}

export function generateEvent(root, eventName, producer = 'à-renseigner') {
  const match = /^([a-z][a-z-]*)\.([a-z_]+)$/.exec(eventName ?? '');
  if (!match)
    throw new Error(
      `événement : nom <entité>.<verbe au passé> attendu (ex. stock.reserved), reçu « ${eventName} ».`,
    );
  const file = `contracts/schemas/events/${match[1]}-${match[2].replace(/_/g, '-')}.schema.json`;
  if (existsSync(join(root, file))) throw new Error(`${file} existe déjà.`);
  const title = pascal(`${match[1]}-${match[2].replace(/_/g, '-')}`);
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://atelier.example/schemas/events/${match[1]}-${match[2].replace(/_/g, '-')}.schema.json`,
    title,
    description: `Données de l'événement ${eventName} : identifiants et faits, jamais de donnée sensible.`,
    type: 'object',
    additionalProperties: false,
    required: ['organizationId'],
    properties: { organizationId: { type: 'string', format: 'uuid' } },
  };
  writeFileSync(join(root, file), `${JSON.stringify(schema, null, 2)}\n`);
  const asyncapi = join(root, 'contracts/asyncapi/events.yaml');
  const channel = title.charAt(0).toLowerCase() + title.slice(1);
  const text = readFileSync(asyncapi, 'utf8')
    .replace(
      'channels:\n',
      `channels:\n  ${channel}:\n    address: ${eventName}\n    messages:\n      ${channel}:\n        name: ${eventName}\n        payload:\n          $ref: '../schemas/events/${relativePosix(join(root, 'contracts/schemas/events'), join(root, file))}'\n`,
    )
    .replace(
      'operations:\n',
      `operations:\n  publish${title}:\n    action: send\n    channel: { $ref: '#/channels/${channel}' }\n    x-producer: ${producer}\n    x-consumers: []\n`,
    );
  writeFileSync(asyncapi, text);
  return [file, 'contracts/asyncapi/events.yaml (canal et opération ajoutés)'];
}

export function generateScreen(root, app, screen) {
  assertName(app, 'application');
  assertName(screen, 'écran');
  if (!existsSync(join(root, 'apps', app))) throw new Error(`apps/${app} n'existe pas.`);
  const views = instantiate(root, 'screen-app', `apps/${app}/src/screens/${screen}`, screen);
  const model = instantiate(root, 'screen-feature', `packages/features/src/${screen}`, screen);
  return [...views, ...model];
}
